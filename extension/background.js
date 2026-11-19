import { step } from './engine.js';
import { startAuto, autoStep } from './auto-engine.js';
let serial = Promise.resolve();
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  serial = serial.then(() => handle(message, sender)).then(reply, error => reply({error: error.message}));
  return true;
});

async function handle(m, sender) {
  const { config = {items: []} } = await chrome.storage.local.get('config');
  let { state = {running: false, status: 'Düğmeleri tanıtarak başlayın.'} } = await chrome.storage.session.get('state');
  if (m.type === 'get') return {config, state};
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
    if (url.origin !== 'https://akademi.mlpcare.com' || !/\/courses\/?$/.test(url.pathname) || url.searchParams.get('activeTab') !== 'notStarted') throw new Error('Önce Başlamadıklarım sekmesini açın.');
    state = startAuto(m.tabId, tab.url, Date.now());
  } else if (m.type === 'autoNotice') {
    if (!state.tabs?.includes(sender.tab?.id)) return {};
    state.status = m.text;
  } else if (m.type === 'autoTick') {
    if (!state.running || state.mode !== 'auto' || !state.tabs.includes(sender.tab?.id)) return {};
    const observation = {...m.observation, owner: `${sender.tab.id}:${sender.frameId}`, root: sender.tab.id === state.root && sender.frameId === 0};
    const oldPhase = state.phase;
    const action = autoStep(state, observation, Date.now());
    await chrome.storage.session.set({state});
    // Close only child player tabs opened by this run, after completion/skip.
    if (oldPhase === 'return' && state.phase !== 'return') {
      for (const id of state.tabs.filter(id => id !== state.root)) await chrome.tabs.remove(id).catch(() => {});
      state.tabs = [state.root];
      await chrome.storage.session.set({state});
    }
    return {action};
  } else if (m.type === 'start') {
    for (const key of ['launch', 'next', 'progress', 'counter', 'close']) {
      if (!config[key]) throw new Error(`${key} seçimi eksik. Önce düğmeleri tanıtın.`);
    }
    if (!config.items.length) throw new Error('En az bir eğitim seçin.');
    state = {running: true, stage: 'select', index: 0, total: config.items.length,
      root: m.tabId, tabs: [m.tabId], changed: Date.now(), status: 'Eğitim listesi bekleniyor…'};
  } else if (m.type === 'stop') {
    state.running = false; state.status = m.reason || 'Durduruldu.';
  } else if (m.type === 'tick') {
    if (!state.running || !state.tabs.includes(sender.tab?.id)) return {};
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
