const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {spawn}=require('node:child_process');
const dir=fs.realpathSync(process.argv[2] || path.join(__dirname,'../extension'));
const m=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
const files=[m.background.service_worker,m.action.default_popup,...m.content_scripts.flatMap(x=>x.js)];
const html=fs.readFileSync(path.join(dir,m.action.default_popup),'utf8');
for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g))files.push(match[1]);
for(const file of files)if(!fs.existsSync(path.join(dir,file)))throw Error('Missing: '+file);
console.log('Manifest V'+m.manifest_version+'; referenced files present. Folder: '+dir);
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'extension-check-'));
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--enable-unsafe-extension-debugging','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
const fixture=fs.readFileSync(path.join(__dirname,'fixtures/catalog.html'),'utf8');
let onEvent=()=>{};
let ws,id=0;const pending=new Map(),errors=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function send(method,params={},sessionId){return new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>{pending.delete(n);reject(Error('Timeout: '+method));},10000);pending.set(n,{resolve:x=>{clearTimeout(timer);resolve(x);},reject:e=>{clearTimeout(timer);reject(e);}});ws.send(JSON.stringify({id:n,method,params,...(sessionId?{sessionId}:{})}));});}
(async()=>{try{
let port;for(let n=0;n<100;n++){try{port=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0];break;}catch{await sleep(100);}}
if(!port)throw Error('Chrome debugging endpoint unavailable');
const version=await(await fetch('http://127.0.0.1:'+port+'/json/version')).json();
ws=new WebSocket(version.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
ws.onmessage=event=>{const msg=JSON.parse(event.data);if(!msg.id)onEvent(msg);if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);if(p)msg.error?p.reject(Error(JSON.stringify(msg.error))):p.resolve(msg.result);}else if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails);else if(msg.method==='Log.entryAdded' && msg.params.entry.level==='error')errors.push(msg.params.entry);};
const loaded=await send('Extensions.loadUnpacked',{path:dir});console.log('Chrome loaded extension:',loaded.id);
const {targetId}=await send('Target.createTarget',{url:'chrome-extension://'+loaded.id+'/popup.html'});
const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
await send('Runtime.enable',{},sessionId);await send('Log.enable',{},sessionId);await sleep(1800);
const result=await send('Runtime.evaluate',{expression:'(async()=>({title:document.title,status:document.getElementById("status")?.textContent,reply:await chrome.runtime.sendMessage({type:"get"})}))()',awaitPromise:true,returnByValue:true},sessionId);
if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));
if(!result.result.value?.reply?.config)throw Error('Popup/background message failed');
console.log('Popup and service worker:',JSON.stringify(result.result.value));
const {targetInfos}=await send('Target.getTargets');console.log('Service worker registered:',targetInfos.some(x=>x.type==='service_worker'&&x.url.includes(loaded.id)));
if(errors.length)throw Error('Runtime errors: '+JSON.stringify(errors));
console.log('PASS: extension loaded; popup and service worker respond; no observed runtime errors.');

const worker=targetInfos.find(x=>x.type==='service_worker'&&x.url.includes(loaded.id));
const workerSession=(await send('Target.attachToTarget',{targetId:worker.targetId,flatten:true})).sessionId;
await send('Runtime.enable',{},workerSession);
const page=(await send('Target.createTarget',{url:'about:blank'})).targetId;
const pageSession=(await send('Target.attachToTarget',{targetId:page,flatten:true})).sessionId;
await send('Runtime.enable',{},pageSession);
await send('Fetch.enable',{patterns:[{urlPattern:'*'}]},pageSession);
onEvent=msg=>{if(msg.method==='Fetch.requestPaused')send('Fetch.fulfillRequest',{requestId:msg.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/html; charset=utf-8'}],body:Buffer.from(fixture).toString('base64')},msg.sessionId).catch(e=>errors.push(e.message));};
await send('Target.activateTarget',{targetId:page});
await send('Page.navigate',{url:'https://akademi.mlpcare.com/mlpcareakademi/eep/main/courses?activeTab=notStarted'},pageSession);
await sleep(1000);
// Seed the run directly: CDP does not grant the action-click activeTab permission.
const {startAuto}=await import(require('node:url').pathToFileURL(path.join(dir,'auto-engine.js')).href);
const setup=await send('Runtime.evaluate',{expression:'(async()=>{const [tab]=await chrome.tabs.query({active:true,lastFocusedWindow:true}); const ping=await chrome.tabs.sendMessage(tab.id,{type:"ping"},{frameId:0}); if(!ping.ready)throw Error("Content script missing"); await chrome.storage.session.set({state:startAuto(tab.id,"https://akademi.mlpcare.com/mlpcareakademi/eep/main/courses?activeTab=notStarted",Date.now())}); return ping;})()'.replace('startAuto(', '('+startAuto.toString()+')('),awaitPromise:true,returnByValue:true},workerSession);
if(setup.exceptionDetails)throw Error(JSON.stringify(setup.exceptionDetails));
console.log('Content script handshake:',JSON.stringify(setup.result.value));
let observed;
for(let attempt=0;attempt<50;attempt++){
 await sleep(400);
 const r=await send('Runtime.evaluate',{expression:'({...document.body.dataset})',returnByValue:true},pageSession);
 observed=r.result.value;
 if(observed.launched==='yes')break;
}
const stateResult=await send('Runtime.evaluate',{expression:'chrome.storage.session.get("state")',awaitPromise:true,returnByValue:true},workerSession);
console.log('Catalog fixture:',JSON.stringify(observed),'phase:',stateResult.result.value.state.phase);
if(observed.module!=='24'||observed.lesson!=='Uzun içerik'||observed.launched!=='yes')throw Error('Catalog workflow failed: '+JSON.stringify(stateResult.result.value));
if(errors.length)throw Error('Runtime errors: '+JSON.stringify(errors));
console.log('PASS: inner scroller, linkless/background-image cards, shortest module, first lesson in page order and launch.');
for(let attempt=0;attempt<25 && observed.resumed!=='yes';attempt++){await sleep(400);observed=(await send('Runtime.evaluate',{expression:'({...document.body.dataset})',returnByValue:true},pageSession)).result.value;}
if(observed.resumed!=='yes')throw Error('Resume control (div + icon text) was not clicked: '+JSON.stringify(observed));
console.log('PASS: "Kaldığın Yerden Devam Et" div with icon text is clicked.');
await send('Runtime.evaluate',{expression:'document.body.dataset.lesson="";document.body.dataset.launched="";',returnByValue:true},pageSession);
const directURL='https://akademi.mlpcare.com/mlpcareakademi/eep/main/activity/24';
const directState=startAuto(stateResult.result.value.state.root,directURL,Date.now());
await send('Runtime.evaluate',{expression:'chrome.storage.session.set({state:'+JSON.stringify(directState)+'})',awaitPromise:true},workerSession);
for(let attempt=0;attempt<30;attempt++){
 await sleep(400);
 observed=(await send('Runtime.evaluate',{expression:'({...document.body.dataset})',returnByValue:true},pageSession)).result.value;
 if(observed.launched==='yes')break;
}
if(observed.lesson!=='Uzun içerik'||observed.launched!=='yes')throw Error('Direct module workflow failed: '+JSON.stringify(observed));
if(errors.length)throw Error('Runtime errors: '+JSON.stringify(errors));
console.log('PASS: start inside module and process remaining contents in page order.');
await send('Runtime.evaluate',{expression:'document.body.insertAdjacentHTML("beforeend","<p>Bu eğitim sonunda sınav bulunmaktadır.</p>")'},pageSession);
await send('Runtime.evaluate',{expression:'chrome.storage.session.set({state:'+JSON.stringify(startAuto(directState.root,directURL,Date.now()))+'})',awaitPromise:true},workerSession);
await send('Runtime.evaluate',{expression:'document.body.dataset.lesson="";document.body.dataset.launched="";',returnByValue:true},pageSession);
let exclusionState;
for(let attempt=0;attempt<25;attempt++){
 await sleep(400);
 exclusionState=(await send('Runtime.evaluate',{expression:'(async()=>({...(await chrome.storage.local.get("excludedModules")),...(await chrome.storage.session.get("state"))}))()',awaitPromise:true,returnByValue:true},workerSession)).result.value;
 observed=(await send('Runtime.evaluate',{expression:'({...document.body.dataset})',returnByValue:true},pageSession)).result.value;
 if(observed.launched==='yes')break;
}
if(exclusionState.excludedModules?.length||!exclusionState.state.running||observed.launched!=='yes')throw Error('Exam text should not exclude: '+JSON.stringify({exclusionState,observed}));
console.log('PASS: exam text no longer excludes the module; content still launches.');

await send('Browser.close');
}catch(e){console.error(e.message);process.exitCode=1;}finally{if(ws)ws.close();chrome.kill();setTimeout(()=>{fs.rmSync(profile,{recursive:true,force:true});},500);}})();
