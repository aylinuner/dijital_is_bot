import test from 'node:test';
import assert from 'node:assert/strict';
import {isExcluded,activityId,excludeModule} from '../extension/exclusions.js';
import {startAuto,autoStep} from '../extension/auto-engine.js';
import '../extension/helpers.js';
const url='https://akademi.mlpcare.com/mlpcareakademi/eep/main/activity/42';
test('elle mod dışlama kaydı kimlik ve başlıkla eşleşir',()=>{
 const s={modules:[{url,title:'Yangın'}],moduleIndex:0,results:[]};excludeModule(s,{},1);
 assert.ok(isExcluded({url:url+'?foo=bar'},s.excludedModules));
 assert.ok(isExcluded({title:'  YANGIN ',key:'yeni-kart'},s.excludedModules));
 assert.ok(!isExcluded({url:url.replace('42','43'),title:'Başka'},s.excludedModules));
});
test('otomatik mod sınav metni yüzünden modülü dışlamaz',()=>{
 const s=startAuto(1,url,0);
 autoStep(s,{root:true,url,moduleTitle:'Modül',examText:true},1);
 assert.equal(s.excludedModules,undefined);assert.notEqual(s.phase,'examExit');
});
test('sınav sözcüğünün ekleri ve ön/son test yazıları algılanır',()=>{
 for(const value of ['Sınavdan sonra','SINAVINIZ','Son Test','quiz'])assert.ok(globalThis.educationHelpers.isExamText(value));
 assert.equal(globalThis.educationHelpers.isExamText('Hasta Hakları'),false);
 assert.equal(activityId(url),'42');
});
test('ön test sınav sayılmaz; son test ve sınav sayılır',()=>{
 const {isExamText,isPreTestText}=globalThis.educationHelpers;
 for(const value of ['Ön Test','ÖN TESTİ','Ön Test Sınavı','Pre-test'])assert.ok(isPreTestText(value)&&!isExamText(value),value);
 assert.ok(isExamText('Ön Test ve Son Test'));
 assert.ok(!isPreTestText('Son Test'));
});
