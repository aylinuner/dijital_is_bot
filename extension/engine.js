export function percentage(text) {
  const m = String(text).trim().match(/^(?:%\s*(\d{1,3}(?:[.,]\d+)?)|(\d{1,3}(?:[.,]\d+)?)\s*%)$/);
  const n = m ? Number((m[1] ?? m[2]).replace(',', '.')) : NaN;
  return n >= 0 && n <= 100 ? n : null;
}

export function step(s, o, now) {
  if (!s.running) return null;
  if (now - s.changed > 90000) {
    s.running = false;
    s.status = '90 saniye ilerleme olmadı. Seçimleri, açılır pencere iznini ve sayfayı kontrol edin.';
    return null;
  }
  if (s.stage === 'select' && o.list) {
    s.stage = 'launch'; s.changed = now; s.status = `Eğitim ${s.index + 1} seçildi.`;
    return 'item';
  }
  if (s.stage === 'launch' && o.list && o.launch && now - s.changed >= 2000) {
    s.stage = 'opening'; s.changed = now; s.status = 'Eğitim açılıyor…';
    return 'launch';
  }
  if (s.stage === 'opening' && o.player) {
    s.stage = 'playing'; s.owner = o.owner; s.signature = ''; s.completeSeen = null; s.changed = now;
  }
  if (s.stage === 'playing' && o.player && s.owner === o.owner) {
    const signature = o.counter;
    if (s.signature !== signature) {
      s.signature = signature; s.seen = now; s.changed = now; s.clicked = false;
    }
    s.status = `Eğitim ${s.index + 1}: ${o.counter} — %${o.percent ?? '?'}`;
    if (o.percent === 100) s.completeSeen ??= now;
    else s.completeSeen = null;
    if (now - s.seen < 2000) return null;
    if (o.percent === 100) {
      if (now - s.completeSeen < 2000) return null;
      if (!o.close) { s.status = '%100 görüldü. Kapat düğmesini tanıtın.'; return null; }
      s.stage = 'returning'; s.changed = now; s.status = '%100 görüldü; eğitim kapatılıyor.';
      return 'close';
    }
    if (o.next && !s.clicked) {
      s.clicked = true;
      return 'next';
    }
  }
  if (s.stage === 'returning' && o.list && !o.player && now - s.changed >= 3000) {
    s.index++; s.changed = now;
    if (s.index >= s.total) { s.running = false; s.status = 'Seçilen eğitim sırası tamamlandı. Platformdaki kayıt durumunu kontrol edin.'; }
    else { s.stage = 'select'; s.status = 'Sıradaki eğitime geçiliyor…'; }
  }
  return null;
}
