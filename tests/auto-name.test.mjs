import test from 'node:test';
import assert from 'node:assert/strict';
import {AutoNamer} from '../src/tools/ad-downloader/auto-name.ts';
function makeEntry(no,url){return {id:'ad'+no,no:String(no),displayName:'AD'+no+'_Original',url};}
test('Auto-name requires a user-approved writable directory, not a passive file scan',async()=>{
  const prior=globalThis.window;
  const namer=new AutoNamer();
  try {
    globalThis.window={isSecureContext:true,showDirectoryPicker:async()=>({kind:'directory',name:'Downloads',queryPermission:async()=> 'denied',async *entries(){}})};
    await assert.rejects(namer.chooseFolder(),/Read and write permission/);
    assert.equal(namer.active,false);
  } finally {namer.dispose();globalThis.window=prior;}
});
test('Auto-name tracks new unambiguous files and marks them verified only after three stable scans',async()=>{
  const prior=globalThis.window;
  const names=new Map();
  const folder={kind:'directory',name:'Downloads',queryPermission:async()=> 'granted',
    async *entries(){for(const [name] of names)yield [name,{kind:'file'}];},
    async getFileHandle(name){const handle=names.get(name);if(!handle)throw Object.assign(Error('Missing'),{name:'NotFoundError'});return handle;},
  };
  globalThis.window={isSecureContext:true,showDirectoryPicker:async()=>folder};
  const namer=new AutoNamer();
  try{
    assert.equal(await namer.chooseFolder(),'Downloads');
    const url='https://tenant.sharepoint.com/sites/T/Shared%20Documents/Original.mp4';
    const entry=makeEntry(1,url);
    const events=[];
    assert.equal(namer.begin(entry,message=>events.push(message),target=>events.push('complete '+target)),true);
    assert.equal(namer.begin(makeEntry(2,url),()=>{},()=>{}),false,'same SharePoint source name must not be auto-matched to another ad');
    const sourceName='Original.mp4';
    const originalFile=new File(['video'],sourceName,{type:'video/mp4',lastModified:Date.now()-2700});
    const handle={kind:'file',getFile:async()=>originalFile,async move(target){names.delete(sourceName);names.set(target,handle);}};
    names.set(sourceName,handle);
    await namer.scanOnce();await namer.scanOnce();
    assert.equal(namer.stats().renamed,0);
    assert.ok(names.has(sourceName),'must not rename before stable observation');
    await namer.scanOnce();
    assert.equal(namer.stats().renamed,1);
    assert.equal(namer.stats().waiting,0);
    assert.ok(names.has('AD1_Original.mp4'));
    assert.ok(events.includes('complete AD1_Original.mp4'));
  }finally{namer.dispose();globalThis.window=prior;}
});
