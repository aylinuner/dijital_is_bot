(() => {
  const {durationMinutes,seekTarget}=globalThis.educationHelpers;
  const ranges=value=>value?Array.from({length:value.length},(_,i)=>[value.start(i),value.end(i)]):[];
  const visible=el=>Boolean(el && el.getClientRects().length && getComputedStyle(el).visibility!=='hidden');
  const enabled=el=>visible(el)&&!el.disabled&&el.getAttribute('aria-disabled')!=='true'&&getComputedStyle(el).pointerEvents!=='none';
  const text=el=>(el?.innerText||el?.textContent||'').trim().replace(/\s+/g,' ');
  const norm=s=>s.toLocaleLowerCase('tr-TR').trim().replace(/\s+/g,' ');
  const label=el=>norm(el.getAttribute('aria-label')||el.getAttribute('title')||text(el));
  const query=selector=>{try{return document.querySelector(selector);}catch{return null;}};
  let scannedURL='',scanSignature='',stable=0;
  const used=new Map();
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
    const counter=bound(config,'counter')||leaf.find(el=>/^\d+\s*\/\s*\d+$/.test(text(el)));
    const playerPage=/ipadPlayer|\/player\//i.test(location.pathname);
    const progress=bound(config,'progress')||(counter||playerPage?leaf.find(el=>/^(%\s*\d{1,3}|\d{1,3}\s*%)$/.test(text(el))):null);
    const match=text(progress).match(/^(?:%\s*(\d{1,3}(?:[.,]\d+)?)|(\d{1,3}(?:[.,]\d+)?)\s*%)$/);
    const percent=match?Number((match[1]??match[2]).replace(',','.')):null;
    const controls={
      next:bound(config,'next')||exact(['ileri','ilerle','sonraki','sonraki sayfa','next','next slide','→','❯'])||query('#nextButton, #btnNext, .next-button, .next-slide, .vjs-next-control'),
      close:bound(config,'close')||exact(['kapat','close','×'])||query('#closeButton, #btnClose, .close-player'),
      launch:exact(['başla','başlat','devam et','eğitime başla','eğitime devam et'])||bound(config,'launch'),
      resume:exact(['kaldığın yerden devam et','kaldığınız yerden devam et','kaldığım yerden devam et','devam etmek istiyorum','resume']),
      play:exact(['oynat','videoyu oynat','play','play video'])||query('.vjs-big-play-button, .plyr__control--overlaid'),
      more:exact(['sonraki sayfa','daha fazla göster','daha fazla yükle'])
    };
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
          cards.set(key,el);modules.push({key,url:url.href,label:key,minutes:durationMinutes(text(card)),catalogUrl:location.href});
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
            if(!cards.has(key)){cards.set(key,card);modules.push({key,label:t,minutes:durationMinutes(t),url:null,catalogUrl:location.href});}
            break;
          }
        }
      }
    }
    const lessons=[]; const rows=new Map();
    if (/\/activity\/\d+/.test(location.pathname)) {
      // Repeated list rows contain a short duration/type label. Avoid the detail panel.
      for (const el of leaf.filter(el=>/^(?:e[- ]?eğitim|video)\s*[-–]/i.test(text(el))&&text(el).length<80)) {
        let row=el.parentElement;
        for(let i=0;i<3 && row;i++,row=row.parentElement) {
          const t=text(row);
          if(t.length>text(el).length && t.length<400 && row.parentElement.children.length>=2 &&
             [...row.parentElement.children].filter(x=>/(?:e[- ]?eğitim|video)\s*[-–]/i.test(text(x))).length>=2) {
            const title=t.replace(/(?:e[- ]?eğitim|video)\s*[-–].*$/i,'').trim();
            const key=title||t;
            if(!rows.has(key)){rows.set(key,row);lessons.push({key,label:title||t,minutes:durationMinutes(text(el))});}
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
    const sig=modules.map(x=>x.key).join('|')+'|'+document.documentElement.scrollHeight;
    if(scannedURL!==location.href){scannedURL=location.href;scanSignature='';stable=0;}
    if(sig===scanSignature) stable++;else {stable=0;scanSignature=sig;}
    const bottom=window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-10;
    const data={url:location.href,modules,lessons,scanDone:bottom&&stable>=6,
      more:enabled(controls.more),player:Boolean(visible(counter)&&visible(progress)),counter:text(counter),percent,
      video:Boolean(video),time:video?.currentTime||0,ended:video?.ended||false,paused:video?.paused||false,
      videoSource:video?.currentSrc||'',seeking:video?.seeking||false,
      seekTarget:video?seekTarget(video.currentTime,video.duration,ranges(video.buffered),ranges(video.seekable)):null};
    for(const key of ['next','close','launch','resume','play']) data[key]=enabled(controls[key]);
    return {data,controls,rows,cards,video};
  }
  window.educationAutoTick=async(config,state)=>{
    const snapshot=observe(config,state);
    const {action}=await chrome.runtime.sendMessage({type:'autoTick',observation:snapshot.data});
    if(!action)return;
    const {state:latest}=await chrome.runtime.sendMessage({type:'get'});
    if(!latest.running || latest.mode!=='auto')return;
    if(action.type==='navigate') {location.assign(action.url);return;}
    if(action.type==='scan'){window.scrollBy(0,Math.max(400,window.innerHeight*0.8));return;}
    if(action.type==='module'){snapshot.cards.get(action.key)?.click();return;}
    if(action.type==='lesson') {snapshot.rows.get(action.key)?.click();return;}
    if(action.type==='videoPlay') {
      try {await snapshot.video?.play();}
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
      try {video.currentTime=target;await video.play();}
      catch {await chrome.runtime.sendMessage({type:'autoNotice',text:'Video ileri sarma/oynatma isteğini kabul etmedi; normal oynatma deneniyor.'});}
      return;
    }
    const el=snapshot.controls[action.type];
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
