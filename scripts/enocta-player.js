/* Enocta oyuncusunda normal düğmelere basar; platform ilerleme verisi yazmaz.
   Durdurmak için Esc veya window.egitimRunner.stop(). */
(() => {
  if (window.egitimRunner?.running) return JSON.stringify(window.egitimRunner.status());
  const state = {running: true, page: '', percent: '', seen: Date.now(), lastChange: Date.now(), clicked: false, result: '', history: []};
  const visible = el => el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
  const read = id => document.getElementById(id)?.textContent.trim() || '';
  let timer;
  function stop(reason = 'Elle durduruldu') {
    state.running = false; state.result = reason; clearInterval(timer);
    document.removeEventListener('keydown', onKey);
    return reason;
  }
  function onKey(event) { if (event.key === 'Escape') stop(); }
  function tick() {
    try {
      const page = read('pageCount2');
      const percent = read('progressTextDiv');
      if (!page) { stop('Sayaç bulunamadı.'); return; }
      if (page !== state.page) {
        state.page = page; state.seen = Date.now(); state.lastChange = Date.now(); state.clicked = false;
        state.history.push({page, at: new Date().toISOString()});
      }
      state.percent = percent;
      const exam = [...document.querySelectorAll('button,[role="button"]')].some(el => visible(el) && /sınava başla|sınavı başlat|start quiz/i.test(el.textContent));
      if (exam || [...document.querySelectorAll('input[type="radio"],[role="radiogroup"]')].some(visible)) {stop('Sınav/etkileşim görüldü; atlanmak üzere durduruldu.');return;}
      // Require at least 2 seconds on each newly observed slide.
      if (Date.now() - state.seen < 2200) return;
      if (/^(?:%\s*100|100\s*%)$/.test(percent)) { stop('Oyuncuda %100 görüldü.'); return; }
      if (Date.now() - state.lastChange > 90000) {stop('90 saniye ilerleme yok.');return;}
      const images = [...document.querySelectorAll('#pageMask img')].filter(visible);
      if (images.some(el => el.src && !el.complete)) return;
      const next = document.getElementById('gonext');
      if (!state.clicked && visible(next) && next.getAttribute('aria-disabled') !== 'true' && getComputedStyle(next).pointerEvents !== 'none') {
        state.clicked = true; next.click();
      }
    } catch (error) {stop(error.message);}
  }
  window.egitimRunner = {stop, status: () => ({running:state.running,page:state.page,percent:state.percent,result:state.result,visited:state.history.length}), history:state.history};
  document.addEventListener('keydown', onKey);
  timer = setInterval(tick, 250); tick();
  return JSON.stringify(window.egitimRunner.status());
})();
