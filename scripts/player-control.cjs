// macOS: node scripts/player-control.cjs <windowId> <tabId> [start|video-start|status|stop]
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const [windowId,tabId,mode='status']=process.argv.slice(2);
if(!/^\d+$/.test(windowId)||!/^\d+$/.test(tabId)||!['start','video-start','status','stop'].includes(mode))throw Error('Usage: node scripts/player-control.cjs <windowId> <tabId> [start|video-start|status|stop]');
const js=['start','video-start'].includes(mode)?fs.readFileSync(path.join(__dirname,mode==='start'?'enocta-player.js':'enocta-videos.js'),'utf8'):mode==='stop'?'(window.egitimVideoRunner || window.egitimRunner)?.stop()':'JSON.stringify((window.egitimVideoRunner || window.egitimRunner)?.status() || {error:"Çalışma bulunamadı"})';
const apple='on run argv\n tell application "Google Chrome"\n return execute tab id '+tabId+' of window id '+windowId+' javascript (item 1 of argv)\n end tell\nend run';
process.stdout.write(execFileSync('osascript',['-e',apple,js],{encoding:'utf8'}));
