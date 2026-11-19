import test from 'node:test';
import assert from 'node:assert/strict';
import {step, percentage} from '../extension/engine.js';
const initial = () => ({running:true,stage:'opening',index:0,total:2,changed:0});
const observation = {player:true,owner:'1:0',counter:'5 / 59',percent:8,next:true,close:true};
test('iki saniye bekler; yüzde güncellemesi aynı slayta tekrar tıklatmaz', () => {
  const s = initial();
  assert.equal(step(s,observation,100),null);
  assert.equal(step(s,observation,2099),null);
  assert.equal(step(s,observation,2100),'next');
  assert.equal(step(s,{...observation,percent:9},5000),null);
  assert.equal(step(s,{...observation,counter:'6 / 59'},6000),null);
  assert.equal(step(s,{...observation,counter:'6 / 59'},8000),'next');
});
test('kilitli düğme beklenir ve başka frame komut alamaz', () => {
  const s = initial(); step(s,observation,100);
  assert.equal(step(s,{...observation,next:false},2200),null);
  assert.equal(step(s,{...observation,owner:'2:0'},2500),null);
  assert.equal(step(s,observation,2600),'next');
});
test('yüzde 100 kararlı olmadan kapanmaz; sonra sıradaki eğitime geçer', () => {
  const s = initial(); step(s,observation,100);
  const done = {...observation,percent:100};
  assert.equal(step(s,done,3000),null);
  assert.equal(step(s,done,5000),'close');
  assert.equal(step(s,{list:true,player:false},6000),null);
  step(s,{list:true,player:false},8000);
  assert.equal(s.index,1);
  assert.equal(step(s,{list:true},8100),'item');
  assert.equal(step(s,{list:true,launch:true},10099),null);
  assert.equal(step(s,{list:true,launch:true},10100),'launch');
});
test('ilerleme yoksa durur; son eğitimden sonra durur', () => {
  const s = initial(); step(s,observation,100);
  step(s,observation,90101); assert.equal(s.running,false);
  const last = {...initial(),stage:'returning',index:1};
  step(last,{list:true,player:false},3000); assert.equal(last.running,false);
});
test('yüzde metni tam eşleşir, 1000 veya başka metin tamamlanma sayılmaz', () => {
  for (const text of ['%100','100%','% 100','100,0 %']) assert.equal(percentage(text),100);
  for (const text of ['%1000','sayfa 100','%100 diğer %20','']) assert.equal(percentage(text),null);
});
