(() => {
  function durationMinutes(value) {
    const s=String(value ?? '').toLocaleLowerCase('tr-TR');
    const hours=s.match(/(?:^|[^\d])(\d+(?:[.,]\d+)?)\s*(?:saat|sa)\b/);
    const minutes=s.match(/(?:^|[^\d])(\d+(?:[.,]\d+)?)\s*(?:dakika|dk)\b/);
    if(!hours && !minutes)return null;
    const number=m=>m?Number(m[1].replace(',','.')):0;
    return number(hours)*60+number(minutes);
  }
  function sortByDuration(items, longestLast=false) {
    const duration=item=>Number.isFinite(item.minutes)?item.minutes:durationMinutes(item.durationText ?? item.label);
    return [...items].sort((a,b)=>{
      const x=duration(a),y=duration(b);
      if(longestLast && (x===710)!==(y===710)) return x===710?1:-1;
      return (x ?? Number.MAX_SAFE_INTEGER)-(y ?? Number.MAX_SAFE_INTEGER);
    });
  }
  function seekTarget(time,duration,buffered,seekable) {
    if(!Number.isFinite(time)||!Number.isFinite(duration)||duration<=0)return null;
    // Stay in the loaded, seekable segment containing the current playhead.
    for(const [start,end] of buffered) {
      if(time<start || time>end)continue;
      for(const [allowedStart,allowedEnd] of seekable) {
        if(time<allowedStart || time>allowedEnd)continue;
        const target=Math.min(end,allowedEnd,duration)-0.5;
        if(target>time+1)return target;
      }
    }
    return null;
  }
  globalThis.educationHelpers={durationMinutes,sortByDuration,seekTarget};
})();
