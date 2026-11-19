import test from 'node:test';
import assert from 'node:assert/strict';
import {startAuto,autoStep} from '../extension/auto-engine.js';
const home='https://akademi.mlpcare.com/mlpcareakademi/eep/main/courses?activeTab=notStarted';
const module={key:'m1',label:'Modül',url:'https://akademi.mlpcare.com/mlpcareakademi/eep/main/activity/1',catalogUrl:home};
const lesson={key:'l1',label:'İçerik'};
function playing(){return {...startAuto(1,home,0),phase:'playing',modules:[module],lessons:[lesson,{key:'l2',label:'İkinci'}],owner:'1:0',signature:null,retries:0};}
const slide={root:true,owner:'1:0',url:module.url,player:true,counter:'1 / 10',percent:10,next:true};
test('katalog sırası korunur ve modül içeriği seçilir',()=>{
 const s=startAuto(1,home,0);
 autoStep(s,{root:true,url:home,modules:[module],scanDone:false},0);
 autoStep(s,{root:true,url:home,modules:[module],scanDone:true},1000);
 assert.equal(s.modules.length,1);
 assert.deepEqual(autoStep(s,{root:true,url:home},3000),{type:'navigate',url:module.url});
 assert.deepEqual(autoStep(s,{root:true,url:module.url,lessons:[lesson]},5000),{type:'lesson',key:'l1'});
 assert.deepEqual(autoStep(s,{root:true,launch:true},7000),{type:'launch'});
 assert.deepEqual(autoStep(s,{root:true,resume:true},17000),{type:'resume'});
});
test('slayt iki saniye bekler, yüzde değişince tekrar basmaz',()=>{
 const s=playing();autoStep(s,slide,100);
 assert.equal(autoStep(s,slide,2099),null);
 assert.deepEqual(autoStep(s,slide,2100),{type:'next'});
 assert.equal(autoStep(s,{...slide,percent:20},5000),null);
 assert.equal(autoStep(s,{...slide,owner:'2:0',counter:'2 / 10'},8000),null);
});
test('video oynatılır, ilerleyen uzun video zaman aşımına uğramaz',()=>{
 const s=playing();const v={root:true,owner:'1:0',video:true,time:0,paused:true};
 assert.deepEqual(autoStep(s,v,1),{type:'videoPlay'});
 for(let i=1;i<=120;i++)autoStep(s,{...v,time:i*5,paused:false},i*5000+1);
 assert.equal(s.phase,'playing');assert.equal(s.results.length,0);
 autoStep(s,{...v,time:605,ended:true},605001);
 assert.equal(s.results[0].outcome,'done');assert.equal(s.phase,'return');
});
test('slayt içindeki video bitince eğitim tamamlandı sayılmaz',()=>{
 const s=playing();autoStep(s,{...slide,video:true,ended:true,time:120},100);
 assert.equal(s.results.length,0);
 assert.deepEqual(autoStep(s,{...slide,video:true,ended:true,time:120},2200),{type:'next'});
});
test('iki yeniden deneme sonra atlar; atlanan eğitim tamamlandı sayılmaz',()=>{
 const s=playing();autoStep(s,slide,0);autoStep(s,slide,2000);
 autoStep(s,slide,90001);assert.equal(s.retries,1);
 autoStep(s,slide,180002);assert.equal(s.retries,2);
 assert.equal(autoStep(s,slide,270003).type,'navigate');
 assert.equal(s.results[0].outcome,'skipped');
});
test('%100 kararlı olduktan sonra kapatır, dönüşte sonraki içeriği seçer',()=>{
 const s=playing();const o={...slide,percent:100,close:true};
 autoStep(s,o,100);
 assert.deepEqual(autoStep(s,o,2100),{type:'close'});
 assert.equal(s.results[0].outcome,'done');
 assert.deepEqual(autoStep(s,{root:true,url:module.url},5100),{type:'navigate',url:module.url});
 autoStep(s,{root:true,url:module.url,lessons:s.lessons,video:true},8100);
 assert.equal(s.lessonIndex,1);assert.equal(s.phase,'select');
});
test('bağlantısız kart tıklanır, açılan modül URL kaydedilir',()=>{
 const s=startAuto(1,home,0);const card={...module,url:null};
 autoStep(s,{root:true,url:home,modules:[card],scanDone:true},0);
 assert.deepEqual(autoStep(s,{root:true,url:home,modules:[card]},2000),{type:'module',key:'m1'});
 autoStep(s,{root:true,url:module.url,lessons:[lesson]},4000);
 assert.equal(s.modules[0].url,module.url);assert.equal(s.phase,'opening');
});
test('durdurulmuş çalışma hiçbir işlem üretmez',()=>{
 const s=playing();s.running=false;assert.equal(autoStep(s,slide,5000),null);
});
test('bitmeyen katalog taraması sessizce takılmak yerine açıklamayla durur',()=>{
 const s=startAuto(1,home,0);
 autoStep(s,{root:true,modules:[module],scanDone:false,scanPosition:'0/500 px'},1000);
 assert.match(s.status,/1 eğitim bulundu/);
 autoStep(s,{root:true,modules:[module],scanDone:false},120001);
 assert.equal(s.running,false);
 assert.match(s.status,/120 saniyede tamamlanamadı/);
});
test('sınav etiketli modül ve içerik hariç tutulmaz, açılır',()=>{
 const s={...startAuto(1,home,0),phase:'enterModule',modules:[{...module,label:'Bilgi Sınavı'}]};
 assert.deepEqual(autoStep(s,{root:true},1),{type:'navigate',url:module.url});
 const exam={key:'exam',label:'Son Test',exam:true,minutes:1};
 assert.deepEqual(autoStep(s,{root:true,url:module.url,lessons:[exam],examText:true},3000),{type:'lesson',key:'exam'});
 assert.equal(s.excludedModules,undefined);
});
test('normal içerikte sınav ekranı çıkarsa rastgele cevaplar',()=>{
 const s={...playing(),phase:'opening',owner:null};
 assert.deepEqual(autoStep(s,{...slide,exam:true,quizQuestion:true,quizUnanswered:true,resume:true,launch:true},1),{type:'quizAnswer'});
 assert.equal(s.results.length,0);
});
test('yüzde 100 kalırken sayaç değişse bile yeni slaytta iki saniye bekler',()=>{
 const s=playing();
 autoStep(s,{...slide,percent:100},100);
 assert.equal(autoStep(s,{...slide,percent:100,counter:'2 / 10'},2000),null);
 assert.equal(autoStep(s,{...slide,percent:100,counter:'2 / 10'},3999),null);
 assert.deepEqual(autoStep(s,{...slide,percent:100,counter:'2 / 10',close:true},4000),{type:'close'});
});
test('oyuncu çıkış onayı varsa normal Eğitimden Çık düğmesini kullanır',()=>{
 const s={...playing(),phase:'return'};
 assert.deepEqual(autoStep(s,{player:true,confirmExit:true},100),{type:'confirmExit'});
});
test('açık eğitimde katalog olmadan başlar ve sayfa sırasını korur',()=>{
 const s=startAuto(1,module.url,0);
 assert.equal(s.scope,'current');assert.equal(s.phase,'module');
 const lessons=[{key:'long',label:'Uzun',minutes:30},{key:'short',label:'Kısa',minutes:1}];
 assert.deepEqual(autoStep(s,{root:true,url:module.url,moduleTitle:'Açık modül',lessons},0),{type:'lesson',key:'long'});
 assert.equal(s.modules[0].label,'Açık modül');
});
test('tamamlanmış içerik yeniden açılmaz',()=>{
 const s=startAuto(1,module.url,0);
 const o={root:true,url:module.url,lessons:[{...lesson,completed:true},{key:'next',label:'Sonraki',completed:false}]};
 assert.deepEqual(autoStep(s,o,0),{type:'lesson',key:'next'});
 assert.equal(s.results[0].outcome,'done');
});
test('tamamlanmayan içerik bitmeden sonrakine geçmez; 3 denemeden sonra durur',()=>{
 const a={key:'a',label:'1.1',completed:false},b={key:'b',label:'1.2',completed:false};
 const s=startAuto(1,module.url,0);
 const list={root:true,url:module.url,lessons:[a,b]};
 let t=0;
 const untilLesson=()=>{for(let i=0;i<10;i++){const r=autoStep(s,list,t+=3000);if(r?.type==='lesson')return r;}return null;};
 for(let attempt=1;attempt<=3;attempt++) {
  assert.deepEqual(untilLesson(),{type:'lesson',key:'a'});
  assert.deepEqual(autoStep(s,{root:true},t+=91000),{type:'navigate',url:module.url});
  assert.equal(s.results.at(-1).outcome,'skipped');
 }
 assert.equal(untilLesson(),null);
 assert.equal(s.running,false);assert.match(s.status,/3 denemede tamamlanmadı/);
});
test('tamamlandı işareti gelince sıradaki içeriğe geçer; gelmezse kısa süre bekler',()=>{
 const a={key:'a',label:'1.1',completed:false},b={key:'b',label:'1.2',completed:false};
 const s=startAuto(1,module.url,0);
 autoStep(s,{root:true,url:module.url,lessons:[a,b]},0);
 autoStep(s,{root:true,url:module.url,completedLessonKeys:['a'],selectedLessonKey:'a'},3000);
 assert.equal(s.phase,'return');
 assert.deepEqual(autoStep(s,{root:true,url:module.url},7000),{type:'navigate',url:module.url});
 autoStep(s,{root:true,url:module.url,lessons:[a,b]},11000);
 assert.equal(autoStep(s,{root:true,url:module.url,lessons:[a,b]},14000),null);
 assert.match(s.status,/işareti bekleniyor/);
 assert.deepEqual(autoStep(s,{root:true,url:module.url,lessons:[{...a,completed:true},b]},15000),{type:'lesson',key:'b'});
});
test('video bitişini liste işaretinden de doğrular',()=>{
 const s=playing();
 assert.equal(autoStep(s,{root:true,completedLessonKeys:['l1'],selectedLessonKey:'next'},100),null);
 assert.equal(s.results[0].outcome,'done');assert.equal(s.phase,'return');
});
test('oyuncunun sunduğu hız bir kaynakta bir kez seçilir',()=>{
 const s=playing();const v={...slide,player:false,video:true,time:5,fastRate:true,videoSource:'one',seekTarget:null};
 assert.deepEqual(autoStep(s,v,1),{type:'videoRate'});
 assert.equal(autoStep(s,v,2),null);
});
test('ön test modülü dışlamaz; rastgele cevaplar, ilerler ve gönderir',()=>{
 const pre={key:'pre',label:'Ön Test',preTest:true};
 const s={...startAuto(1,module.url,0),lessons:[pre,lesson]};
 assert.deepEqual(autoStep(s,{root:true,url:module.url,lessons:[pre,lesson]},0),{type:'lesson',key:'pre'});
 const q={root:false,owner:'2:0',examText:true,exam:true};
 assert.deepEqual(autoStep(s,{...q,quizStart:true},3000),{type:'quizStart'});
 assert.deepEqual(autoStep(s,{...q,quizQuestion:true,quizUnanswered:true,quizNext:true},5000),{type:'quizAnswer'});
 assert.deepEqual(autoStep(s,{...q,quizQuestion:true,quizNext:true},7000),{type:'quizNext'});
 assert.deepEqual(autoStep(s,{...q,quizQuestion:true,quizSubmit:true},9000),{type:'quizSubmit'});
 assert.deepEqual(autoStep(s,{...q,quizConfirm:true},11000),{type:'quizConfirm'});
 assert.equal(s.excludedModules,undefined);
 assert.equal(autoStep(s,{root:false,owner:'2:0'},13000),null);
 assert.deepEqual(autoStep(s,{root:false,owner:'2:0',close:true},15000),{type:'close'});
 assert.equal(s.results[0].outcome,'done');assert.equal(s.phase,'return');
});
test('son test de rastgele cevaplanır',()=>{
 const post={key:'post',label:'Son Test',exam:true};
 const s={...startAuto(1,module.url,0),lessons:[post]};
 assert.deepEqual(autoStep(s,{root:true,url:module.url,lessons:[post]},0),{type:'lesson',key:'post'});
 assert.deepEqual(autoStep(s,{root:false,owner:'2:0',examText:true,quizQuestion:true,quizUnanswered:true},3000),{type:'quizAnswer'});
 assert.deepEqual(autoStep(s,{root:false,owner:'2:0',quizQuestion:true,quizSubmit:true},5000),{type:'quizSubmit'});
 assert.equal(autoStep(s,{root:false,owner:'2:0'},7000),null);
 assert.equal(autoStep(s,{root:false,owner:'2:0'},9000),null);
 assert.equal(s.results[0].outcome,'done');
});
test('minimum süre dolmadan %100 olsa bile oyuncuyu kapatmaz',()=>{
 const l={key:'l1',label:'1.1 İSG',minutes:9,minRule:true};
 const s={...startAuto(1,module.url,0),lessons:[l]};
 assert.deepEqual(autoStep(s,{root:true,url:module.url,lessons:[l]},0),{type:'lesson',key:'l1'});
 const p={root:false,owner:'2:0',player:true,counter:'5 / 5',percent:100,close:true};
 autoStep(s,p,3000);
 assert.equal(autoStep(s,p,6000),null);assert.match(s.status,/Minimum süre/);
 assert.equal(autoStep(s,p,200000),null);assert.equal(s.phase,'playing');
 assert.deepEqual(autoStep(s,p,9*60000+30001),{type:'close'});
 assert.equal(s.results[0].outcome,'done');
});
test('platformdaki "X dakika daha" kalan süresi kullanılır; tamamlandı işareti hemen geçirir',()=>{
 const l={key:'l1',label:'1.1 İSG',minutes:9};
 const s={...startAuto(1,module.url,0),lessons:[l]};
 autoStep(s,{root:true,url:module.url,lessons:[l]},0);
 autoStep(s,{root:true,url:module.url,selectedLessonKey:'l1',remainingMinutes:1},2500);
 assert.equal(s.minUntil,90000);
 const v={root:false,owner:'2:0',video:true,ended:true,time:60,videoSource:'v'};
 autoStep(s,{...v,ended:false},5000);
 assert.equal(autoStep(s,v,60000),null);assert.equal(s.results.length,0);
 autoStep(s,v,90001);assert.equal(s.results[0].outcome,'done');
});
test('min. kuralı olmayan içerik %100 görülünce kapanır ve sıradakine geçer',()=>{
 const a={key:'a',label:'Hasta Hakları',minutes:40,minRule:false,completed:false},b={key:'b',label:'Hekimlerle İlişkiler',minutes:10,minRule:false,completed:false};
 const s=startAuto(1,module.url,0);
 assert.deepEqual(autoStep(s,{root:true,url:module.url,lessons:[a,b]},0),{type:'lesson',key:'a'});
 const p={root:false,owner:'2:0',player:true,counter:'25 / 25',percent:100,close:true};
 autoStep(s,p,3000);
 assert.deepEqual(autoStep(s,p,5000),{type:'close'});
 assert.equal(s.results[0].outcome,'done');
 autoStep(s,{root:true,url:module.url},9000);
 autoStep(s,{root:true,url:module.url,lessons:[{...a,completed:true},b]},13000);
 assert.deepEqual(autoStep(s,{root:true,url:module.url,lessons:[{...a,completed:true},b]},16000),{type:'lesson',key:'b'});
});
