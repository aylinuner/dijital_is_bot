/* Enocta modülünde Video satırlarını sırayla oynatır. Yalnızca yüklenmiş ve
   sarılabilir aralık içinde ilerler; tamamlanma verisi veya olayları üretmez. */
(() => {
  if(window.egitimVideoRunner?.status().running)return JSON.stringify(window.egitimVideoRunner.status());
  const rows=()=>[...document.querySelectorAll('.unit-info')];
  const title=row=>row?.querySelector('.unit-info-title')?.textContent.trim()||'';
  const queue=rows().filter(row=>/^Video(?:\s|$)/i.test(row.querySelector('.unit-info-type-name')?.textContent||'')).map(row=>({id:row.id,title:title(row),minutes:Number((row.querySelector('.unit-info-type-name').textContent.match(/(\d+)\s*dk/)||[])[1]||0)})).sort((a,b)=>a.minutes-b.minutes);
  const state={running:true,index:0,total:queue.length,title:'',phase:'select',time:0,duration:0,result:'',results:[],lastChange:Date.now(),gate:0,attempted:-1,source:'',lastTime:-1};
  let timer,busy=false;
  function stop(reason='Elle durduruldu'){state.running=false;state.result=reason;clearInterval(timer);document.removeEventListener('keydown',key);return reason;}
  function key(e){if(e.key==='Escape')stop();}
  function done(reason,confirmed){state.results.push({title:state.title,reason,confirmed});state.index++;state.phase='select';state.gate=Date.now()+2000;state.lastChange=Date.now();state.lastTime=-1;state.attempted=-1;state.source='';}
  async function tick(){
    if(busy||!state.running||Date.now()<state.gate)return;
    busy=true;
    try{
      const item=queue[state.index];
      if(!item){stop('Video sırası bitti; ana sayfadan kayıtları doğrulayın.');return;}
      const row=document.getElementById(item.id);
      if(!row){stop('İçerik satırı bulunamadı.');return;}
      if(state.phase==='select'){
        state.title=item.title;
        if(row.querySelector('.unit-info-right-block')?.textContent.includes('check_circle')){done('Zaten tamamlandı.',true);return;}
        if(!row.classList.contains('selected'))row.querySelector('.unit-info-title').click();state.phase='loading';state.gate=Date.now()+2500;state.lastChange=Date.now();return;
      }
      if(row.querySelector('.unit-info-right-block')?.textContent.includes('check_circle')){done('Platform tamamlandı işaretini gösterdi.',true);return;}
      if(Date.now()-state.lastChange>90000){done('90 saniye ilerleme yok; atlandı.',false);return;}
      if(!row.classList.contains('selected'))return;
      const video=document.querySelector('video');
      if(!video||!Number.isFinite(video.duration))return;
      if(video.currentSrc!==state.source){state.source=video.currentSrc;state.attempted=-1;state.lastTime=-1;}
      state.time=video.currentTime;state.duration=video.duration;
      if(state.time>state.lastTime+0.25){state.lastChange=Date.now();state.lastTime=state.time;}
      if(video.ended){
        if(state.phase!=='ended'){state.phase='ended';state.gate=Date.now()+4000;return;}
        const confirmed=row.querySelector('.unit-info-right-block')?.textContent.includes('check_circle') || /tamamladın/i.test(document.querySelector('.unit-detail')?.textContent||'');
        done('Video doğal ended durumuna ulaştı.',Boolean(confirmed));return;
      }
      state.phase='playing';
      // Use only the playback speed explicitly offered by this player.
      if(video.playbackRate<2) {
        const speed=[...document.querySelectorAll('.vjs-playback-rate .vjs-menu-item')].find(el=>el.querySelector('.vjs-menu-item-text')?.textContent.trim()==='2x');
        speed?.click();
      }
      if(video.paused){
        document.querySelector('.vjs-big-play-button')?.click();
        try{await video.play();}catch(error){
          if(error.name==='NotAllowedError') {
            video.muted=true;
            try{await video.play();}catch(retry){stop('Oynatma izni gerekli: '+retry.message);return;}
          } else {stop('Oynatma başarısız: '+error.message);return;}
        }
      }
      if(video.seeking)return;
      let target=null;
      for(let i=0;i<video.buffered.length;i++)for(let j=0;j<video.seekable.length;j++){
        if(video.currentTime>=video.buffered.start(i)&&video.currentTime<=video.buffered.end(i)&&video.currentTime>=video.seekable.start(j)&&video.currentTime<=video.seekable.end(j))target=Math.min(video.buffered.end(i),video.seekable.end(j),video.duration)-0.6;
      }
      if(target!==null&&target>video.currentTime+1&&target>state.attempted+0.5){state.attempted=target;video.currentTime=target;state.gate=Date.now()+1500;}
    }catch(error){stop(error.message);}finally{busy=false;}
  }
  window.egitimVideoRunner={stop,status:()=>({...state,results:[...state.results]})};
  document.addEventListener('keydown',key);timer=setInterval(tick,400);tick();return JSON.stringify(window.egitimVideoRunner.status());
})();
