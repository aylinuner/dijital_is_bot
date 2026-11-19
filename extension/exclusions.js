export const catalogURL='https://akademi.mlpcare.com/mlpcareakademi/eep/main/courses?activeTab=notStarted&order=0';
const norm=value=>String(value||'').replace(/[\u200b-\u200f\ufeff]/g,'').replace(/\s+/g,' ').trim().toLocaleLowerCase('tr-TR');
export function activityId(url){return String(url||'').match(/\/activity\/(\d+)/)?.[1]||null;}
export function isExcluded(module,excluded=[]) {
  if(!module)return false;
  const id=activityId(module.url);
  return excluded.some(entry=>(id&&entry.activityId===id)||(module.key&&entry.key===module.key)||
    (module.title&&entry.title&&norm(module.title)===norm(entry.title)));
}
export function excludeModule(s,o,now) {
  const module=s.modules[s.moduleIndex];
  if(!module)return;
  const record={activityId:activityId(module.url),url:module.url||'',key:module.key||'',
    title:module.title||o.moduleTitle||module.label,reason:'İçerikte sınav ifadesi bulundu.',excludedAt:new Date(now).toISOString()};
  s.excludedModules ||= [];
  if(!isExcluded(module,s.excludedModules))s.excludedModules.push(record);
  s.results.push({module:record.title,lesson:'',outcome:'skipped',reason:record.reason+' Eğitim kalıcı olarak hariç tutuldu.'});
  s.phase='examExit';s.changed=now;s.gate=now;s.owner=null;
  s.status=`Sınav içeren eğitimden çıkılıyor; tekrar açılmayacak: ${record.title}`;
}
