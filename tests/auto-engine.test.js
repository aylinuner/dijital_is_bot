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
