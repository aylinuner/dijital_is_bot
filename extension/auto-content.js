(() => {
  const {durationMinutes,seekTarget,isExamText,isPreTestText}=globalThis.educationHelpers;
  // Visible answer options grouped per question (radio name, or nearest question container).
  function answerGroups() {
    const groups=new Map();
    for(const input of document.querySelectorAll('input[type="radio"],input[type="checkbox"],[role="radio"]')) {
      const target=visible(input)?input:(input.labels?.[0]||input.closest('label'));
      if(!visible(target)||input.disabled||input.getAttribute('aria-disabled')==='true')continue;
      const key=input.name?`${input.type}:${input.name}`:(input.closest('[role="radiogroup"],fieldset,ul,ol,form')||input.parentElement);
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push({target,checked:Boolean(input.checked)||input.getAttribute('aria-checked')==='true'});
    }
    return [...groups.values()];
  }
  const typeLabel=/^(?:e[- ]?eğitim|video|sınav|test|quiz)(?:\s*[-–]|$)/i;
  const typeInRow=/(?:e[- ]?eğitim|video|sınav|test|quiz)\s*[-–]/i;
  const ranges=value=>value?Array.from({length:value.length},(_,i)=>[value.start(i),value.end(i)]):[];
  async function playVideo(video) {
    if(!video)return;
    try{await video.play();}catch(error){
      if(error.name!=='NotAllowedError')throw error;
      video.muted=true;await video.play();
    }
  }
  const visible=el=>Boolean(el && el.getClientRects().length && getComputedStyle(el).visibility!=='hidden');
  const enabled=el=>visible(el)&&!el.disabled&&el.getAttribute('aria-disabled')!=='true'&&getComputedStyle(el).pointerEvents!=='none';
  const text=el=>(el?.innerText||el?.textContent||'').trim().replace(/\s+/g,' ');
  const norm=s=>s.toLocaleLowerCase('tr-TR').trim().replace(/\s+/g,' ');
  const label=el=>norm(el.getAttribute('aria-label')||el.getAttribute('title')||text(el));
  const query=selector=>{try{return document.querySelector(selector);}catch{return null;}};
  let scannedURL='',scanSignature='',stable=0;
  const used=new Map();
  function scrollArea(cards) {
    const candidates=new Set();
    for(const card of cards) {
      for(let el=card.parentElement;el;el=el.parentElement) {
        if(el.clientHeight>0 && el.scrollHeight>el.clientHeight+10 && /auto|scroll/.test(getComputedStyle(el).overflowY)) candidates.add(el);
      }
    }
    // The catalog may render its cards only after its own scroll container moves.
    if(!candidates.size) for(const el of document.querySelectorAll('main,section,div')) {
      if(visible(el) && el.clientHeight>200 && el.clientWidth>300 && el.scrollHeight>el.clientHeight+10 && /auto|scroll/.test(getComputedStyle(el).overflowY)) candidates.add(el);
    }
    return [...candidates].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0] || document.scrollingElement || document.documentElement;
  }
  // "Kaldığın yerden devam et" may be a div/span, contain an icon ligature (play_arrow) or extra punctuation.
  const resumePattern=/(?:kald[ıi]ğ\p{L}*\s+yerden\s+devam|devam\s+etmek\s+istiyorum|^resume\b)/u;
  const iconless=s=>s.replace(/\b[a-z]+(?:_[a-z]+)+\b/g,' ').replace(/\s+/g,' ').trim();
  function findResume(els) {
    const clickable=el=>el.closest('button,a,[role="button"],[onclick],[tabindex]')||el;
    const candidates=[...els,...[...document.querySelectorAll('span,div,p,label,li')].filter(el=>visible(el)&&el.children.length<=2)];
    const matches=candidates.map(el=>clickable(el)).filter(el=>{const t=iconless(label(el));return t.length<80&&resumePattern.test(t);});
    // The smallest matching element is the button itself, not a dialog around it.
    return matches.sort((a,b)=>text(a).length-text(b).length)[0]||null;
  }
  function press(el) {
    const r=el.getBoundingClientRect(),o={bubbles:true,cancelable:true,view:window,clientX:r.left+r.width/2,clientY:r.top+r.height/2};
    for(const type of ['pointerdown','mousedown','pointerup','mouseup'])el.dispatchEvent(new (type.startsWith('pointer')&&window.PointerEvent?PointerEvent:MouseEvent)(type,o));
    el.click();
  }
  function bound(config,key) {
    const b=config[key];
    if (!b) return null;
    // Activity IDs vary, while the shared player pathname normally stays constant.
    const compatible=b.path===location.pathname || (/\/activity\/\d+/.test(b.path)&&/\/activity\/\d+/.test(location.pathname));
    const el=compatible?query(b.selector):null;
    return visible(el)?el:null;
  }
  function observe(config,state) {
    const els=[...document.querySelectorAll('button,a,[role="button"],input[type="button"],input[type="submit"]')].filter(visible);
    const exact=words=>els.find(el=>words.includes(label(el)));
    const leaf=[...document.querySelectorAll('span,div,p,strong,b')].filter(el=>visible(el)&&el.children.length===0);
    // The course page (lesson list) is never a player: its "0 / 4000" note counter and "0%" bar are not slides.
    const coursePage=Boolean(document.querySelector('.unit-info-title'));
    const nearTextBox=el=>{for(let p=el.parentElement,i=0;p&&i<3;p=p.parentElement,i++)if(p.querySelector('textarea,input[type="text"]'))return true;return false;};
    const counter=bound(config,'counter')||query('#pageCount2')||(coursePage?null:leaf.find(el=>/^\d+\s*\/\s*\d+$/.test(text(el))&&!nearTextBox(el)));
    const playerPage=/ipadPlayer|\/player\//i.test(location.pathname);
    const progress=bound(config,'progress')||query('#progressTextDiv')||(!coursePage&&(counter||playerPage)?leaf.find(el=>/^(%\s*\d{1,3}|\d{1,3}\s*%)$/.test(text(el))):null);
    const match=text(progress).match(/^(?:%\s*(\d{1,3}(?:[.,]\d+)?)|(\d{1,3}(?:[.,]\d+)?)\s*%)$/);
    const percent=match?Number((match[1]??match[2]).replace(',','.')):null;
    const controls={
      next:bound(config,'next')||exact(['ileri','ilerle','sonraki','sonraki sayfa','next','next slide','→','❯'])||query('#gonext, #nextButton, #btnNext, .next-button, .next-slide, .vjs-next-control'),
      close:bound(config,'close')||exact(['kapat','close','×'])||query('#exitButton, #closeButton, #btnClose, .close-player'),
      launch:exact(['başla','başlat','devam et','eğitime başla','eğitime devam et'])||bound(config,'launch'),
      resume:findResume(els),
      play:exact(['oynat','videoyu oynat','play','play video'])||query('.vjs-big-play-button, .plyr__control--overlaid'),
      more:exact(['sonraki sayfa','daha fazla göster','daha fazla yükle'])
    };
    Object.assign(controls,{
      quizStart:exact(['sınava başla','sınavı başlat','teste başla','testi başlat','ön teste başla','ön testi başlat','start quiz','start exam','start test']),
      quizNext:exact(['sonraki soru','sonraki','ileri','cevapla','kaydet','next']),
      quizSubmit:exact(['bitir','testi bitir','sınavı bitir','gönder','cevapları gönder','tamamla','testi tamamla','sınavı tamamla','submit','finish']),
      quizConfirm:exact(['evet','tamam','onayla','ok','yes'])
    });
    controls.confirmExit=leaf.find(el=>visible(el)&&norm(text(el))==='eğitimden çık');
    controls.videoRate=[...document.querySelectorAll('.vjs-playback-rate .vjs-menu-item')].find(el=>text(el.querySelector('.vjs-menu-item-text'))==='2x');
    const videos=[...document.querySelectorAll('video')].filter(visible);
    const video=videos.find(el=>!el.ended)||videos[0];
    const modules=[]; const cards=new Map();
    if (/\/courses\/?$/.test(location.pathname)) {
      for(const el of document.querySelectorAll('a[href*="/activity/"]')) {
        const url=new URL(el.href,location.href);
        if(url.origin===location.origin && visible(el) && !modules.some(x=>x.url===url.href)) {
          const key=text(el)||el.querySelector('img')?.alt||url.pathname;
          let card=el;
          for(let i=0;i<4 && durationMinutes(text(card))===null && card.parentElement;i++) {
            const parent=card.parentElement;
            const links=new Set([...parent.querySelectorAll('a[href*="/activity/"]')].map(a=>a.href));
            if(links.size>1 || text(parent).length>600)break;
            card=parent;
          }
          cards.set(key,el);modules.push({key,url:url.href,label:key,title:text(card.querySelector('.object-title'))||key,minutes:durationMinutes(text(card)),catalogUrl:location.href});
        }
      }
    }
    if (/\/courses\/?$/.test(location.pathname) && !modules.length) {
      for(const img of document.querySelectorAll('img')) {
        let card=img.parentElement;
        for(let i=0;i<5 && card;i++,card=card.parentElement){
          const t=text(card);
          if(visible(card) && t.length<500 && /\d+\s*(?:sa|dk)\b/.test(t) && card.querySelectorAll('img').length===1){
            const key=t;
            if(!cards.has(key)){cards.set(key,card);modules.push({key,label:t,title:text(card.querySelector('.object-title'))||t,minutes:durationMinutes(t),url:null,catalogUrl:location.href});}
            break;
          }
        }
      }
    }
    if (/\/courses\/?$/.test(location.pathname) && !modules.length) {
      // Cards may use CSS background images and click handlers instead of <img>/<a>.
      for(const duration of leaf.filter(el=>/^(?:\d+\s*(?:sa(?:at)?|dk|dakika)\s*)+$/i.test(text(el)))) {
        let card=duration.parentElement;
        for(let i=0;i<6 && card;i++,card=card.parentElement) {
          const t=text(card);
          if(t.length>500)break;
          const siblings=[...(card.parentElement?.children || [])];
          const repeated=siblings.filter(el=>durationMinutes(text(el))!==null).length>=2;
          if(t.length>text(duration).length+3 && (repeated || getComputedStyle(card).cursor==='pointer')) {
            const key=t;
            if(!cards.has(key)){cards.set(key,card);modules.push({key,label:t,title:text(card.querySelector('.object-title'))||t,minutes:durationMinutes(text(duration)),url:null,catalogUrl:location.href});}
            break;
          }
        }
      }
    }
    const lessons=[]; const rows=new Map();
    if (/\/activity\/\d+/.test(location.pathname)) {
      // Repeated list rows contain a short duration/type label. Avoid the detail panel.
      const typeElements=[...new Set([...document.querySelectorAll('.unit-info-type-name'),...leaf])];
      for (const el of typeElements.filter(el=>visible(el)&&typeLabel.test(text(el))&&text(el).length<80)) {
        const knownRow=el.closest('.unit-info-left-block');
        const knownTitle=knownRow?.querySelector('.unit-info-title');
        if(knownTitle) {
          const key=text(knownTitle);
          const preTest=isPreTestText(key)||isPreTestText(text(el));
          if(!rows.has(key)){rows.set(key,knownTitle);lessons.push({key,label:key,minutes:durationMinutes(text(el)),minRule:/min\.?\s*\d/i.test(text(el)),completed:text(knownRow.closest('.unit-info')?.querySelector('.unit-info-right-block')).includes('check_circle'),preTest,exam:!preTest&&(/^(?:sınav|test|quiz)(?:\s|$)/i.test(text(el)) || isExamText(key))});}
          continue;
        }
        let row=el.parentElement;
        for(let i=0;i<3 && row;i++,row=row.parentElement) {
          const t=text(row);
          if(t.length>text(el).length && t.length<400 && row.parentElement.children.length>=2 &&
             [...row.parentElement.children].filter(x=>typeInRow.test(text(x))).length>=2) {
            const title=t.replace(/(?:e[- ]?eğitim|video|sınav|test|quiz)\s*[-–].*$/i,'').trim();
            const key=title||t;
            const preTest=isPreTestText(key);
            if(!rows.has(key)){rows.set(key,row);lessons.push({key,label:title||t,minutes:durationMinutes(text(el)),minRule:/min\.?\s*\d/i.test(text(el)),preTest,exam:!preTest&&(/^(?:sınav|test|quiz)(?:\s|$)/i.test(text(el)) || isExamText(title))});}
            break;
          }
        }
      }
      // Explicitly selected items remain a fallback for unusual list markup.
      if(!lessons.length) for(const item of config.items||[]) {
        const el=bound({item},'item');
        if(visible(el)){const key=text(el);rows.set(key,el);lessons.push({key,label:key});}
      }
    }
    const scroller=scrollArea(cards.values());
    const sig=modules.map(x=>x.key).join('|')+'|'+scroller.scrollHeight+'|'+Math.round(scroller.scrollTop);
    if(scannedURL!==location.href){scannedURL=location.href;scanSignature='';stable=0;}
    if(sig===scanSignature) stable++;else {stable=0;scanSignature=sig;}
    const bottom=scroller.clientHeight+scroller.scrollTop>=scroller.scrollHeight-10;
    const examStart=exact(['sınava başla','sınavı başlat','sınava devam et','testi başlat','start quiz','start exam']);
    const questions=[...document.querySelectorAll('h1,h2,h3,[role="heading"],legend')].some(el=>visible(el)&&/^(?:soru\s*\d+|\d+\s*[.)]?\s*soru)/i.test(text(el)));
    const answers=[...document.querySelectorAll('input[type="radio"],[role="radiogroup"]')].some(visible);
    const groups=answerGroups();
    const selectedLessonKey=text(document.querySelector('.unit-info.selected .unit-info-title'));
    const data={
      // e.g. "İçeriği tamamlayabilmen için min. 1 dakika daha süre geçirmen gerekiyor."
      remainingMinutes:durationMinutes(document.body.innerText.match(/tamamlayabilmen için\s*(?:min\.?\s*)?((?:\d+\s*(?:saat|sa|dakika|dk)\s*)+)daha/i)?.[1]),
      preTestSelected:Boolean(lessons.find(x=>x.key===selectedLessonKey)?.preTest),
      quizQuestion:Boolean(questions||groups.length),quizUnanswered:groups.some(g=>!g.some(x=>x.checked)),url:location.href,modules,lessons,scanDone:bottom&&stable>=6,
      moduleTitle:text(document.querySelector('.activity-info h3,h1')) || document.title,
      examText:! /\/courses\/?$/.test(location.pathname) && isExamText(document.body.innerText),
      selectedLessonKey:text(document.querySelector('.unit-info.selected .unit-info-title')),
      completedLessonKeys:lessons.filter(x=>x.completed).map(x=>x.key),
      fastRate:Boolean(video && video.playbackRate<2 && controls.videoRate),
      exam:Boolean(examStart || (questions && answers)),
      scanPosition:`${Math.round(scroller.scrollTop)}/${Math.max(0,scroller.scrollHeight-scroller.clientHeight)} px`,
      more:enabled(controls.more),player:Boolean(visible(counter)&&visible(progress)),counter:text(counter),percent,
      video:Boolean(video),time:video?.currentTime||0,ended:video?.ended||false,paused:video?.paused||false,
      videoSource:video?.currentSrc||'',seeking:video?.seeking||false,
      seekTarget:video?seekTarget(video.currentTime,video.duration,ranges(video.buffered),ranges(video.seekable)):null};
    for(const key of ['next','close','launch','resume','play','confirmExit','quizStart','quizNext','quizSubmit','quizConfirm']) data[key]=enabled(controls[key]);
    return {data,controls,rows,cards,video,scroller};
  }
  window.educationAutoTick=async(config,state)=>{
    const snapshot=observe(config,state);
    const {action}=await chrome.runtime.sendMessage({type:'autoTick',observation:snapshot.data});
    if(!action)return;
    const {state:latest}=await chrome.runtime.sendMessage({type:'get'});
    if(!latest.running || latest.mode!=='auto')return;
    if(action.type==='navigate') {location.assign(action.url);return;}
    if(action.type==='scan'){snapshot.scroller.scrollBy(0,Math.max(200,snapshot.scroller.clientHeight*0.8));return;}
    if(action.type==='module'){snapshot.cards.get(action.key)?.click();return;}
    if(action.type==='lesson') {snapshot.rows.get(action.key)?.click();return;}
    if(action.type==='quizAnswer') {
      // Pre-test only: pick one random option for every unanswered question.
      for(const group of answerGroups()) if(!group.some(x=>x.checked)) group[Math.floor(Math.random()*group.length)].target.click();
      return;
    }
    if(action.type==='videoRate'){snapshot.controls.videoRate?.click();return;}
    if(action.type==='videoPlay') {
      try {await playVideo(snapshot.video);}
      catch {await chrome.runtime.sendMessage({type:'autoNotice',text:'Video otomatik oynatma engellendi; oynat düğmesini elle tıklayın. Süre dolarsa içerik atlanır.'});}
      return;
    }
    if(action.type==='videoSeek') {
      const video=snapshot.video;
      if(!video || video.seeking || video.ended)return;
      const allowed=seekTarget(video.currentTime,video.duration,ranges(video.buffered),ranges(video.seekable));
      if(allowed===null)return;
      const target=Math.min(allowed,action.target);
      if(target<=video.currentTime+1)return;
      try {video.currentTime=target;await playVideo(video);}
      catch {await chrome.runtime.sendMessage({type:'autoNotice',text:'Video ileri sarma/oynatma isteğini kabul etmedi; normal oynatma deneniyor.'});}
      return;
    }
    const el=snapshot.controls[action.type];
    if(action.type==='resume' && enabled(el)) {press(el);return;}
    if(enabled(el)) {
      // Avoid endless paging if a site does not react to a pagination click.
      if(action.type==='more') {
        const key=location.href+'|'+snapshot.data.modules.map(x=>x.url).join(',');
        const n=(used.get(key)||0)+1;used.set(key,n);
        if(n>3){await chrome.runtime.sendMessage({type:'stop',reason:'Sonraki liste sayfası açılamadı. Liste taraması durduruldu.'});return;}
        stable=0;
      }
      el.click();
    }
  };
})();
