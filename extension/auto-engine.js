import './helpers.js';
const {sortByDuration}=globalThis.educationHelpers;
export function startAuto(root, home, now) {
  return {mode:'auto',running:true,root,tabs:[root],home,phase:'catalog',modules:[],moduleIndex:0,
    lessons:[],lessonIndex:0,results:[],changed:now,gate:now,status:'Başlamadıklarım taranıyor…'};
}
function resetPlayer(s, now) {
  s.owner=null;s.signature=null;s.clicked=false;s.completeAt=null;s.retries=0;s.launchAttempts=0;s.lastSeekTarget=null;s.videoSource=null;s.changed=now;s.gate=now+2000;
}
function finish(s, outcome, reason, now) {
  s.results.push({module:s.modules[s.moduleIndex]?.label,lesson:s.lessons[s.lessonIndex]?.label || '(içerik algılanamadı)',outcome,reason});
  s.phase='return';s.changed=now;s.gate=now+3000;s.owner=null;s.returnNavigated=false;
  s.status=`${outcome === 'done' ? 'Tamamlanma görüldü' : 'Atlandı'}: ${reason}`;
}
export function autoStep(s,o,now) {
  if (!s.running || now<s.gate) return null;
  const root=o.root;
  if(root && s.phase==='return' && now-s.changed>90000) {
    s.phase='moduleNext';s.status='Modüle dönüş başarısız; sıradaki modül deneniyor.';
  }
  // Root ticks also recover a missing/closed player. Video heartbeats refresh changed.
  if (root && !['catalog','moduleNext'].includes(s.phase) && now-s.changed>90000) {
    if (s.phase==='playing' && s.retries<2) {
      s.retries++;s.clicked=false;s.changed=now;s.status=`İlerleme yeniden deneniyor (${s.retries}/2)…`;
    } else {
      finish(s,'skipped','90 saniye ilerleme alınamadı; tamamlandı sayılmadı.',now);
      return {type:'navigate',url:s.modules[s.moduleIndex].url || s.home};
    }
  }
  if (s.phase==='catalog' && root) {
    for (const item of o.modules || []) if (!s.modules.some(x=>x.key===item.key)) s.modules.push(item);
    if (!o.scanDone) return {type:'scan'};
    if (o.more) {s.gate=now+2500;return {type:'more'};}
    if (!s.modules.length) {s.running=false;s.status='Eğitim kartları algılanamadı. Sayfa HTML yapısı için uyarlama gerekiyor.';return null;}
    s.modules=sortByDuration(s.modules,true);
    s.phase='enterModule';resetPlayer(s,now);
    return null;
  }
  if (s.phase==='enterModule' && root) {
    const module=s.modules[s.moduleIndex];
    if(module.url) {s.phase='module';s.changed=now;return {type:'navigate',url:module.url};}
    if(o.url!==module.catalogUrl){s.gate=now+2000;return {type:'navigate',url:module.catalogUrl};}
    if(o.modules?.some(x=>x.key===module.key)){s.phase='module';s.changed=now;s.gate=now+2000;return {type:'module',key:module.key};}
    return {type:'scan'};
  }
  if(s.phase==='module' && root && !s.modules[s.moduleIndex].url && /\/activity\/\d+/.test(o.url)) s.modules[s.moduleIndex].url=o.url;
  if (s.phase==='module' && root && o.url===s.modules[s.moduleIndex]?.url) {
    if (!o.lessons?.length) return null;
    s.lessons=sortByDuration(o.lessons);s.lessonIndex=0;s.phase='select';s.changed=now;
  }
  if (s.phase==='select' && root && o.url===s.modules[s.moduleIndex]?.url) {
    const lesson=s.lessons[s.lessonIndex];
    if (!lesson) {s.phase='moduleNext';return null;}
    if (!o.lessons?.some(x=>x.key===lesson.key)) return null;
    s.phase='opening';resetPlayer(s,now);s.status=`Açılıyor: ${lesson.label}`;
    return {type:'lesson',key:lesson.key};
  }
  if (['opening','playing'].includes(s.phase)) {
    if (o.resume && (!s.owner || s.owner===o.owner)) {s.gate=now+2500;return {type:'resume'};}
    if (s.phase==='opening') {
      if (o.player || o.video) {s.phase='playing';resetPlayer(s,now);s.owner=o.owner;}
      else if (root && (o.launch || o.play) && s.launchAttempts<3) {s.launchAttempts++;s.gate=now+10000;return {type:o.launch?'launch':'play'};}
    }
    if (s.phase==='playing' && o.owner===s.owner) {
      if (o.video && (!o.player || !o.ended)) {
        if (o.time > (s.videoTime ?? -1)+0.25) {s.changed=now;s.retries=0;}
        s.videoTime=o.time;
        s.status=`Video: ${s.lessons[s.lessonIndex].label} (${Math.floor(o.time)} sn)`;
        if (o.ended) {
          finish(s,'done','Videonun ended durumu görüldü; sunucu kaydı ayrıca kontrol edilmeli.',now);
          return o.close ? {type:'close'} : null;
        }
        if (o.paused) {s.gate=now+5000;return {type:'videoPlay'};}
        if(s.videoSource!==o.videoSource){s.videoSource=o.videoSource;s.lastSeekTarget=null;}
        if(!o.seeking && Number.isFinite(o.seekTarget) && o.seekTarget>o.time+1 &&
           (s.lastSeekTarget==null || o.seekTarget>s.lastSeekTarget+0.5)) {
          s.lastSeekTarget=o.seekTarget;s.gate=now+2000;
          return {type:'videoSeek',target:o.seekTarget};
        }
        return null;
      }
      if (o.player) {
        if (s.signature!==o.counter) {s.signature=o.counter;s.seen=now;s.changed=now;s.clicked=false;s.retries=0;}
        s.status=`${s.lessons[s.lessonIndex].label}: ${o.counter} — %${o.percent ?? '?'}`;
        if (o.percent===100) {
          s.completeAt ??= now;
          if (now-s.completeAt>=2000) {finish(s,'done','Oyuncuda %100 görüldü.',now);return o.close?{type:'close'}:null;}
          return null;
        }
        s.completeAt=null;
        if (now-s.seen>=2000 && o.next && !s.clicked) {s.clicked=true;return {type:'next'};}
      }
    }
  }
  if (s.phase==='return' && root) {
    const module=s.modules[s.moduleIndex];
    if(!module.url || !s.lessons.length){s.phase='moduleNext';return null;}
    if (!s.returnNavigated || o.url!==module.url) {
      s.returnNavigated=true;s.gate=now+3000;return {type:'navigate',url:module.url};
    }
    if(!o.lessons?.length) return null;
    s.lessonIndex++;s.phase=s.lessonIndex<s.lessons.length?'select':'moduleNext';resetPlayer(s,now);s.videoTime=-1;
  }
  if (s.phase==='moduleNext' && root) {
    s.moduleIndex++;s.lessons=[];s.videoTime=-1;
    if (s.moduleIndex>=s.modules.length) {
      s.running=false;
      s.status=`Sıra bitti: ${s.results.filter(x=>x.outcome==='done').length} tamamlanma görüldü, ${s.results.filter(x=>x.outcome==='skipped').length} atlandı. Platform kayıtlarını kontrol edin.`;
      return null;
    }
    s.phase='enterModule';resetPlayer(s,now);
    return null;
  }
  return null;
}
