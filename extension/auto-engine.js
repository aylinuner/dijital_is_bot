import './helpers.js';
import {activityId} from './exclusions.js';
const {sortByDuration,isExamText}=globalThis.educationHelpers;
export function startAuto(root, home, now) {
  const current=/\/activity\/\d+(?:[/?#]|$)/.test(home);
  return {mode:'auto',scope:current?'current':'catalog',running:true,root,tabs:[root],home,phase:current?'module':'catalog',modules:current?[{key:home,url:home,label:'Açık eğitim',catalogUrl:home}]:[],moduleIndex:0,
    lessons:[],lessonIndex:0,results:[],changed:now,gate:now,status:'Başlamadıklarım taranıyor…'};
}
function resetPlayer(s, now) {
  s.owner=null;s.signature=null;s.clicked=false;s.completeAt=null;s.retries=0;s.launchAttempts=0;s.lastSeekTarget=null;s.videoSource=null;s.fastRateTried=false;s.quizActive=false;s.quizSubmitted=false;s.quizActions=0;s.quizLast=null;s.changed=now;s.gate=now+2000;
}
function finish(s, outcome, reason, now) {
  s.results.push({module:s.modules[s.moduleIndex]?.label,lesson:s.lessons[s.lessonIndex]?.label || '(içerik algılanamadı)',outcome,reason});
  if(outcome==='done')s.lastDone={key:s.lessons[s.lessonIndex]?.key,at:now};
  s.phase='return';s.changed=now;s.gate=now+3000;s.owner=null;s.returnNavigated=false;
  s.status=`${outcome === 'done' ? 'Tamamlanma görüldü' : 'Atlandı'}: ${reason}`;
}
// Exams/tests are no longer excluded: every quiz lesson is answered randomly, advanced and submitted.
const isQuiz=lesson=>Boolean(lesson && (lesson.preTest || lesson.exam || isExamText(lesson.label)));
// Returns undefined when no quiz is visible.
function quizStep(s,o,now) {
  const visibleQuiz=o.quizStart||o.quizQuestion||(s.quizActive&&(o.quizConfirm||o.quizSubmit));
  if(!visibleQuiz) {
    if(s.quizSubmitted && now-s.quizLast>=4000) {
      finish(s,'done','Sınav/test rastgele cevaplanıp gönderildi; sonuç platformda kontrol edilmeli.',now);
      return o.close?{type:'close'}:null;
    }
    return undefined;
  }
  if(now<s.gate)return null;
  s.quizActive=true;s.owner??=o.owner;s.phase='playing';s.quizLast=now;
  let action=null;
  if(o.quizUnanswered)action='quizAnswer';
  else if(o.quizConfirm && s.quizSubmitted)action='quizConfirm';
  else if(o.quizNext)action='quizNext';
  else if(o.quizSubmit){action='quizSubmit';s.quizSubmitted=true;}
  else if(o.quizStart)action='quizStart';
  if(!action)return null;
  if(++s.quizActions>300){finish(s,'skipped','Sınav/test 300 adımda bitirilemedi.',now);return null;}
  s.changed=now;s.gate=now+2000;s.status=`Sınav/test (rastgele): ${s.lessons[s.lessonIndex]?.label} (${s.quizActions}. adım)`;
  return {type:action};
}
// The platform only completes a lesson after its "min. X dk" time; keep the player open until then.
const MIN_TIME_MARGIN=30000;
function waitMinimum(s,now) {
  if(!(now<s.minUntil))return false;
  s.changed=now;
  s.status=`Minimum süre bekleniyor: ${s.lessons[s.lessonIndex]?.label} (${Math.ceil((s.minUntil-now)/60000)} dk kaldı)`;
  return true;
}
export function autoStep(s,o,now) {
  if (!s.running) return null;
  const root=o.root;
  const current=s.modules[s.moduleIndex];
  if(s.phase==='module' && root && current && !current.url && activityId(o.url))current.url=o.url;
  const onModule=root && current && activityId(o.url) && activityId(o.url)===activityId(current.url);
  if(onModule && o.moduleTitle)current.title=o.moduleTitle;
  const quizOpen=isQuiz(s.lessons?.[s.lessonIndex]) && ['opening','playing','return'].includes(s.phase);
  if(now<s.gate)return null;
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
    s.status=`Başlamadıklarım taranıyor: ${s.modules.length} eğitim bulundu${o.scanPosition ? ` · ${o.scanPosition}` : ''}.`;
    if(now-s.changed>120000) {
      s.running=false;s.status=`Liste taraması 120 saniyede tamamlanamadı (${s.modules.length} eğitim bulundu). Eksik listeyle başlamamak için durduruldu.`;
      return null;
    }
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
    // Lessons unlock one after another, so always keep the page order.
    s.lessons=[...o.lessons];s.lessonIndex=0;s.attempts={};s.phase='select';s.changed=now;
    for(const x of o.lessons) if(x.completed || o.completedLessonKeys?.includes(x.key))
      s.results.push({module:s.modules[s.moduleIndex].label,lesson:x.label,outcome:'done',reason:'Platformda zaten tamamlandı.'});
    if(s.scope==='current' && o.moduleTitle)s.modules[0].label=o.moduleTitle;
  }
  if (s.phase==='select' && root && o.url===s.modules[s.moduleIndex]?.url) {
    if (!o.lessons?.length) return null;
    const done=x=>x.completed || o.completedLessonKeys?.includes(x.key);
    let index=s.lessonIndex;
    // With the platform's check marks, always work on the first unfinished lesson: the next one stays locked until then.
    if(o.lessons.some(x=>typeof x.completed==='boolean')) {s.lessons=[...o.lessons];index=s.lessons.findIndex(x=>!done(x));}
    else while(index<s.lessons.length && done(s.lessons[index])) index++;
    const lesson=s.lessons[index];
    if (!lesson || index<0) {s.phase='moduleNext';return null;}
    s.lessonIndex=index;
    if(s.lastDone?.key===lesson.key && now-s.lastDone.at<20000) {s.status=`Tamamlandı işareti bekleniyor: ${lesson.label}`;return null;}
    s.attempts||={};
    const tries=s.attempts[lesson.key]||0;
    // Exams are not resubmitted automatically; other lessons get three tries.
    if(tries>=(isQuiz(lesson)?1:3)) {
      s.results.push({module:s.modules[s.moduleIndex].label,lesson:lesson.label,outcome:'skipped',reason:`${tries} denemede platformda tamamlanmadı.`});
      s.status=`"${lesson.label}" ${tries} denemede tamamlanmadı. Sonraki içerikler kilitli olduğundan bu eğitimde durduruldu.`;
      if(s.scope==='current'){s.running=false;return null;}
      s.phase='moduleNext';return null;
    }
    s.attempts[lesson.key]=tries+1;
    s.phase='opening';resetPlayer(s,now);s.status=`Açılıyor: ${lesson.label}`;
    s.openedAt=now;// Only "min. X dk" lessons must stay open; plain durations close as soon as 100% is seen.
    s.minUntil=now+(lesson.minRule&&Number.isFinite(lesson.minutes)?lesson.minutes*60000+MIN_TIME_MARGIN:0);
    return {type:'lesson',key:lesson.key};
  }
  if (['opening','playing'].includes(s.phase)) {
    if(root && o.completedLessonKeys?.includes(s.lessons[s.lessonIndex]?.key)) {
      finish(s,'done','Platform içerik listesinde tamamlandı işareti görüldü.',now);return null;
    }
    if(root && o.selectedLessonKey===s.lessons[s.lessonIndex]?.key && Number.isFinite(o.remainingMinutes) && s.phase==='opening')
      // The platform's own warning means a minimum-time rule applies, whatever the label says.
      s.minUntil=s.openedAt+o.remainingMinutes*60000+MIN_TIME_MARGIN;
    if(root && o.selectedLessonKey && o.selectedLessonKey!==s.lessons[s.lessonIndex]?.key)return null;
    // Also covers quizzes that appear inside ordinary content.
    if((quizOpen || o.exam || s.quizActive) && (!s.owner || s.owner===o.owner)) {
      const quiz=quizStep(s,o,now);
      if(quiz!==undefined)return quiz;
    }
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
        if (o.ended && waitMinimum(s,now)) return null;
        if (o.ended) {
          finish(s,'done','Videonun ended durumu görüldü; sunucu kaydı ayrıca kontrol edilmeli.',now);
          return o.close ? {type:'close'} : null;
        }
        if(s.videoSource!==o.videoSource){s.videoSource=o.videoSource;s.lastSeekTarget=null;s.fastRateTried=false;}
        if(o.fastRate && !s.fastRateTried){s.fastRateTried=true;return {type:'videoRate'};}
        if (o.paused) {s.gate=now+5000;return {type:'videoPlay'};}
        if(!o.seeking && Number.isFinite(o.seekTarget) && o.seekTarget>o.time+1 &&
           (s.lastSeekTarget==null || o.seekTarget>s.lastSeekTarget+0.5)) {
          s.lastSeekTarget=o.seekTarget;s.gate=now+2000;
          return {type:'videoSeek',target:o.seekTarget};
        }
        return null;
      }
      if (o.player) {
        if (s.signature!==o.counter) {s.signature=o.counter;s.seen=now;s.changed=now;s.clicked=false;s.retries=0;s.completeAt=null;}
        s.status=`${s.lessons[s.lessonIndex].label}: ${o.counter} — %${o.percent ?? '?'}`;
        if (o.percent===100) {
          s.completeAt ??= now;
          if (now-s.completeAt>=2000 && waitMinimum(s,now)) return null;
          if (now-s.completeAt>=2000) {finish(s,'done','Oyuncuda %100 görüldü.',now);return o.close?{type:'close'}:null;}
          return null;
        }
        s.completeAt=null;
        if (now-s.seen>=2000 && o.next && !s.clicked) {s.clicked=true;return {type:'next'};}
      }
    }
  }
  if(s.phase==='return' && o.player && o.confirmExit) {
    s.gate=now+1500;return {type:'confirmExit'};
  }
  if (s.phase==='return' && root) {
    const module=s.modules[s.moduleIndex];
    if(!module.url || !s.lessons.length){s.phase='moduleNext';return null;}
    if (!s.returnNavigated || o.url!==module.url) {
      s.returnNavigated=true;s.gate=now+3000;return {type:'navigate',url:module.url};
    }
    if(!o.lessons?.length) return null;
    // Without check marks fall back to page order; with them, select re-picks the first unfinished lesson.
    if(!o.lessons.some(x=>typeof x.completed==='boolean'))s.lessonIndex++;
    s.phase='select';resetPlayer(s,now);s.videoTime=-1;
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
