(() => {
  let picking = null, banner = null, marked = null, busy = false;
  const visible = el => el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
  const enabled = el => visible(el) && !el.disabled && el.getAttribute('aria-disabled') !== 'true' && getComputedStyle(el).pointerEvents !== 'none';
  const label = el => (el.innerText || el.textContent || el.getAttribute('aria-label') || el.title || '').trim().replace(/\s+/g, ' ');
  function selector(el) {
    if (el.id && document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1) return `#${CSS.escape(el.id)}`;
    const parts = [];
    while (el && el !== document.documentElement) {
      const siblings = [...el.parentElement.children].filter(x => x.tagName === el.tagName);
      parts.unshift(`${el.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(el) + 1})`);
      el = el.parentElement;
    }
    return `html > ${parts.join(' > ')}`;
  }
  function locate(binding) {
    if (!binding || binding.path !== location.pathname) return null;
    try { return document.querySelector(binding.selector); } catch { return null; }
  }
  function cleanup() {
    picking = null; banner?.remove(); banner = null;
    if (marked) { marked.style.outline = marked.dataset.deOldOutline || ''; delete marked.dataset.deOldOutline; marked = null; }
  }
  chrome.runtime.onMessage.addListener(m => {
    if (m.type === 'cancelPick') { cleanup(); return; }
    if (m.type !== 'pick') return;
    cleanup(); picking = m.kind;
    banner = document.createElement('div');
    banner.textContent = `Seçim: ${m.title} — ilgili öğeye tıklayın. İptal: Esc`;
    banner.style.cssText = 'position:fixed;top:8px;left:8px;z-index:2147483647;padding:12px;background:#172b4d;color:white;font:14px sans-serif;pointer-events:none;';
    document.documentElement.append(banner);
  });
  document.addEventListener('mouseover', e => {
    if (!picking || !(e.target instanceof Element)) return;
    if (marked) { marked.style.outline = marked.dataset.deOldOutline || ''; delete marked.dataset.deOldOutline; }
    marked = e.target; marked.dataset.deOldOutline = marked.style.outline; marked.style.outline = '3px solid #ff3578';
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { cleanup(); chrome.runtime.sendMessage({type: 'stop'}); } }, true);
  document.addEventListener('click', async e => {
    if (!picking) return;
    e.preventDefault(); e.stopImmediatePropagation();
    let el = e.target;
    if (['launch', 'next', 'close'].includes(picking)) el = el.closest('button,a,[role="button"]') || el;
    const kind = picking;
    const binding = {path: location.pathname, selector: selector(el), label: label(el).slice(0, 160)};
    cleanup();
    await chrome.runtime.sendMessage({type: 'bind', kind, binding});
  }, true);

  function percent(el) {
    const value = label(el || document.createElement('span'));
    const m = value.match(/^(?:%\s*(\d{1,3}(?:[.,]\d+)?)|(\d{1,3}(?:[.,]\d+)?)\s*%)$/);
    const n = m ? Number((m[1] ?? m[2]).replace(',', '.')) : NaN;
    return n >= 0 && n <= 100 ? n : null;
  }
  async function tick() {
    if (busy || picking) return;
    busy = true;
    try {
      const {config, state} = await chrome.runtime.sendMessage({type: 'get'});
      if (!state.running) return;
      if (state.mode === 'auto') { await window.educationAutoTick(config, state); return; }
      const elements = Object.fromEntries(['launch', 'next', 'progress', 'counter', 'close'].map(key => [key, locate(config[key])]));
      elements.item = locate(config.items[state.index]);
      // The chosen course label guards against silently selecting a reordered list item.
      const list = visible(elements.item) && label(elements.item).slice(0, 160) === config.items[state.index]?.label;
      const player = Boolean(visible(elements.progress) && visible(elements.counter));
      const observation = {list: Boolean(list), player,
        counter: elements.counter ? label(elements.counter) : '', percent: percent(elements.progress),
        next: Boolean(enabled(elements.next)), close: Boolean(enabled(elements.close)), launch: Boolean(enabled(elements.launch))};
      const {action} = await chrome.runtime.sendMessage({type: 'tick', observation});
      if (action && enabled(elements[action])) {
        const current = await chrome.runtime.sendMessage({type: 'get'});
        if (current.state.running) elements[action].click();
      }
    } catch (error) { console.debug('Eğitim yardımcısı:', error.message); }
    finally { busy = false; }
  }
  setInterval(tick, 400);
})();
