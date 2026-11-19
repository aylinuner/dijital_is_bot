import test from 'node:test';
import assert from 'node:assert/strict';
import '../extension/helpers.js';
import {autoStep,startAuto} from '../extension/auto-engine.js';
const {durationMinutes,sortByDuration,seekTarget}=globalThis.educationHelpers;
test('Türkçe saat/dakika metinleri ve başlıklardaki yıllar',()=>{
 for(const [label,expected] of [['11sa 50 dk',710],['6 sa 30 dk',390],['24 dk',24],['1 saat 25 dakika',85],['2026 Eğitim 50 dk',50],['1,5 saat',90],['Modül 4',null]])assert.equal(durationMinutes(label),expected);
});
test('kısadan uzuna sıralar; 710 dakika bilinmeyenlerden ve uzunlardan sonra gelir',()=>{
 const items=[{label:'11sa 50 dk'},{label:'6 sa 30 dk'},{label:'24 dk'},{label:'belirsiz'},{label:'24 dk ikinci'},{label:'12 sa'}];
 assert.deepEqual(sortByDuration(items,true).map(x=>x.label),['24 dk','24 dk ikinci','6 sa 30 dk','12 sa','belirsiz','11sa 50 dk']);
 assert.equal(items[0].label,'11sa 50 dk');
});
test('yüklenmiş ve sarılabilir ortak aralığı aşmaz',()=>{
 assert.equal(seekTarget(5,120,[[0,50]],[[0,120]]),49.5);
 assert.equal(seekTarget(5,120,[[0,100]],[[0,30]]),29.5);
 assert.equal(seekTarget(5,120,[[0,120]],[[0,120]]),119.5);
 assert.equal(seekTarget(5,120,[[0,6],[40,90]],[[0,120]]),null);
 assert.equal(seekTarget(5,120,[],[[0,120]]),null);
 assert.equal(seekTarget(5,120,[[0,120]],[]),null);
 assert.equal(seekTarget(5,Infinity,[[0,120]],[[0,120]]),null);
});
test('motor aynı hedefe tekrar sarmaz; yeni yüklenen bölüme ilerler',()=>{
 const s={...startAuto(1,'home',0),phase:'playing',owner:'1:0',lessons:[{label:'Video'}],modules:[{label:'Modül'}]};
 const o={root:true,owner:'1:0',video:true,time:5,videoSource:'v.mp4',seekTarget:49.5};
 assert.deepEqual(autoStep(s,o,0),{type:'videoSeek',target:49.5});
 assert.equal(autoStep(s,o,2000),null);
 assert.deepEqual(autoStep(s,{...o,time:50,seekTarget:79.5},4000),{type:'videoSeek',target:79.5});
 assert.equal(autoStep(s,{...o,seeking:true,seekTarget:110},6000),null);
 assert.equal(s.results.length,0);
});
test('katalog taraması bittikten sonra sıralar',()=>{
 const s=startAuto(1,'home',0);
 autoStep(s,{root:true,modules:[{key:'a',label:'11 sa 50 dk'},{key:'b',label:'24 dk'}],scanDone:true},0);
 assert.deepEqual(s.modules.map(x=>x.key),['b','a']);
});
