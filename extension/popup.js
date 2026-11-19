const $ = id => document.getElementById(id);
async function send(message) {
  const result = await chrome.runtime.sendMessage(message);
  if (result.error) throw new Error(result.error);
  return result;
}
async function active() {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!tab?.url?.startsWith('https://akademi.mlpcare.com/')) throw new Error('Önce akademi.mlpcare.com eğitim sayfasını açın.');
  return tab;
}
async function refresh() {
  const {config, state} = await send({type: 'get'});
  $('status').textContent = state.status;
  $('summary').textContent = state.results ? `${state.modules.length} modül bulundu · ${state.results.filter(x => x.outcome === 'done').length} tamamlanma görüldü · ${state.results.filter(x => x.outcome === 'skipped').length} atlandı` : '';
  $('queue').replaceChildren(...(state.mode === 'auto' ? state.modules : config.items).map((item, index) => {
    const li = document.createElement('li'); li.textContent = `${state.mode === 'auto' && index === state.moduleIndex ? '→ ' : ''}${item.label || '(isimsiz eğitim)'}${Number.isFinite(item.minutes) ? ` (${item.minutes} dk)` : ''}`; return li;
  }));
  const names = {launch: 'Devam Et', next: 'İlerle', progress: 'Yüzde', counter: 'Sayaç', close: 'Kapat'};
  $('bindings').textContent = Object.entries(names).map(([key, name]) => `${config[key] ? '✓' : '○'} ${name}`).join(' · ');
}
document.addEventListener('click', async e => {
  const button = e.target.closest('button'); if (!button) return;
  try {
    if (button.dataset.kind) {
      const tab = await active();
      await send({type: 'stop'});
      await chrome.tabs.sendMessage(tab.id, {type: 'pick', kind: button.dataset.kind, title: button.textContent});
      window.close(); return;
    }
    if (button.id === 'start') await send({type: 'start', tabId: (await active()).id});
    if (button.id === 'autoStart') await send({type: 'autoStart', tabId: (await active()).id});
    if (button.id === 'report') {
      const {state} = await send({type: 'get'});
      const url = URL.createObjectURL(new Blob([JSON.stringify({status: state.status, results: state.results || []}, null, 2)], {type: 'application/json'}));
      const link = document.createElement('a'); link.href = url; link.download = 'egitim-raporu.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    if (button.id === 'stop') await send({type: 'stop'});
    if (button.id === 'clear') await send({type: 'clear'});
    await refresh();
  } catch (error) { $('status').textContent = error.message + ' Sayfayı yenilemek gerekebilir.'; }
});
refresh();
setInterval(refresh, 1500);
