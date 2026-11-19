import { step } from './engine.js';
import { startAuto, autoStep } from './auto-engine.js';
import {catalogURL,excludeModule} from './exclusions.js';
// Exams no longer cause permanent exclusion: drop any list saved by older versions.
let serial = chrome.storage.local.remove('excludedModules').catch(() => {});
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  serial = serial.then(() => handle(message, sender)).then(reply, error => reply({error: error.message}));
  return true;
});

async function handle(m, sender) {
  const { config = {items: []}, excludedModules=[] } = await chrome.storage.local.get(['config','excludedModules']);
  let { state = {running: false, status: 'Düğmeleri tanıtarak başlayın.'} } = await chrome.storage.session.get('state');
  if (m.type === 'get') return {config, state, excludedModules};
  if (m.type === 'bind') {
    if (m.kind === 'item') config.items.push(m.binding);
    else config[m.kind] = m.binding;
    state.running = false; state.status = `Kaydedildi: ${m.kind} (${m.binding.label})`;
    await chrome.storage.local.set({config});
    if (sender.tab) await chrome.tabs.sendMessage(sender.tab.id, {type: 'cancelPick'}).catch(() => {});
  } else if (m.type === 'clear') {
    await chrome.storage.local.set({config: {items: []}});
    state = {running: false, status: 'Seçimler temizlendi.'};
  } else if (m.type === 'autoStart') {
    const tab = await chrome.tabs.get(m.tabId);
    const url = new URL(tab.url);
    const catalog=/\/courses\/?$/.test(url.pathname) && url.searchParams.get('activeTab') === 'notStarted';
    const current=/\/activity\/\d+\/?$/.test(url.pathname);
    if (url.origin !== 'https://akademi.mlpcare.com' || (!catalog && !current)) throw new Error('Başlamadıklarım listesini veya bir eğitimin içerik sayfasını açın.');
    let connection;
    try { connection = await chrome.tabs.sendMessage(m.tabId, {type: 'ping'}, {frameId: 0}); } catch {}
    if (!connection?.ready || connection.version !== chrome.runtime.getManifest().version) {
      state.running = false;
      state.status = 'Sayfa bağlantısı hazır değil. Eğitim sayfasını yenileyin, ardından otomatik başlatın.';
      await chrome.storage.session.set({state});
      throw new Error(state.status);
    }
    state = startAuto(m.tabId, tab.url, Date.now());
    state.excludedModules=excludedModules;
  } else if (m.type === 'autoError') {
    if (!state.running || !state.tabs?.includes(sender.tab?.id)) return {};
    state.running = false;
    state.status = `Sayfa işlemi başarısız: ${String(m.text).slice(0, 300)}. Sayfayı yenileyip yeniden başlatın.`;
  } else if (m.type === 'autoNotice') {
    if (!state.tabs?.includes(sender.tab?.id)) return {};
    state.status = m.text;
  } else if (m.type === 'autoTick') {
    if (!state.running || state.mode !== 'auto' || !state.tabs.includes(sender.tab?.id)) return {};
    const observation = {...m.observation, owner: `${sender.tab.id}:${sender.frameId}`, root: sender.tab.id === state.root && sender.frameId === 0};
    const oldPhase = state.phase;
    state.excludedModules=excludedModules;
    const action = autoStep(state, observation, Date.now());
    if(state.phase==='examExit') {
      for(const id of state.tabs.filter(id=>id!==state.root))await chrome.tabs.remove(id).catch(()=>{});
      state.tabs=[state.root];state.phase='moduleNext';
      if(state.scope==='current')state.running=false;
      await chrome.storage.session.set({state});
      await chrome.tabs.update(state.root,{url:catalogURL});
      return {};
    }
    await chrome.storage.session.set({state});
    // Close only child player tabs opened by this run, after completion/skip.
    if (oldPhase === 'return' && state.phase !== 'return') {
      for (const id of state.tabs.filter(id => id !== state.root)) await chrome.tabs.remove(id).catch(() => {});
      state.tabs = [state.root];
      await chrome.storage.session.set({state});
    }
    return {action};
  } else if (m.type === 'start') {
    const tab=await chrome.tabs.get(m.tabId);
    for (const key of ['launch', 'next', 'progress', 'counter', 'close']) {
      if (!config[key]) throw new Error(`${key} seçimi eksik. Önce düğmeleri tanıtın.`);
    }
    if (!config.items.length) throw new Error('En az bir eğitim seçin.');
    state = {running: true, stage: 'select', index: 0, total: config.items.length,
      root: m.tabId, home:tab.url, tabs: [m.tabId], changed: Date.now(), status: 'Eğitim listesi bekleniyor…'};
  } else if (m.type === 'stop') {
    state.running = false; state.status = m.reason || 'Durduruldu.';
  } else if (m.type === 'tick') {
    if (!state.running || !state.tabs.includes(sender.tab?.id)) return {};
    if(sender.tab.id===state.root && sender.frameId===0 && m.observation.moduleTitle)state.moduleTitle=m.observation.moduleTitle;
    if(m.observation.examText) {
      const block={modules:[{url:state.home,key:state.home,title:state.moduleTitle||m.observation.moduleTitle}],moduleIndex:0,excludedModules,results:[]};
      excludeModule(block,m.observation,Date.now());
      // Leave this module for now, but do not store it as permanently excluded.
      state.running=false;state.status='Sınav görüldü; elle mod durdu. Eğitim kalıcı olarak hariç tutulmadı.';
      await chrome.storage.session.set({state});
      for(const id of state.tabs.filter(id=>id!==state.root))await chrome.tabs.remove(id).catch(()=>{});
      await chrome.tabs.update(state.root,{url:catalogURL});
      return {};
    }
    const owner = `${sender.tab.id}:${sender.frameId}`;
    // Only the initiating tab may advance the course list.
    const observation = {...m.observation, owner, list: m.observation.list && sender.tab.id === state.root};
    const action = step(state, observation, Date.now());
    await chrome.storage.session.set({state});
    return {action};
  } else return {};
  await chrome.storage.session.set({state});
  return {config, state};
}

chrome.tabs.onCreated.addListener(tab => {
  serial = serial.then(async () => {
    const {state} = await chrome.storage.session.get('state');
    if (state?.running && state.tabs.includes(tab.openerTabId)) {
      state.tabs.push(tab.id);
      await chrome.storage.session.set({state});
    }
  }).catch(() => {});
});
