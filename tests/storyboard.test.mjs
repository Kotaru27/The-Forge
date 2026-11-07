import test from 'node:test';
import assert from 'node:assert/strict';
import {
  boardColumns, boardExportNames, folderGroups, naturalCompare, exportName, uniqueBoardName,
  validBoardSettings, DEFAULT_BOARD_SETTINGS, alreadyOnBoard, validateStills,
} from '../src/tools/storyboard/engine.ts';

const board = (name, images=[]) => ({id:name,name,images});

test('Auto columns match CTK: 4 stills are 2x2, and all other boards max at 3 columns',()=>{
  assert.deepEqual([0,1,2,3,4,5,6,10].map(n=>boardColumns(n,0)),[0,1,2,3,2,3,3,3]);
  assert.equal(boardColumns(7,2),2);assert.equal(boardColumns(5,99),3);
});
test('Board settings enforce dimensions and 0–3 columns',()=>{
  assert.equal(validBoardSettings(DEFAULT_BOARD_SETTINGS),true);
  assert.equal(validBoardSettings({...DEFAULT_BOARD_SETTINGS,cols:4}),false);
  assert.equal(validBoardSettings({...DEFAULT_BOARD_SETTINGS,gap:1001}),false);
  assert.equal(validBoardSettings({...DEFAULT_BOARD_SETTINGS,autoWidth:false,width:64,cols:3,gap:200}),false);
});
test('Natural folder sorting: frame_2 before frame_10',()=>{
  const make=(name,path)=>Object.assign(new File(['abc'],name,{type:'image/jpeg'}),{webkitRelativePath:path});
  const f=folderGroups([make('10.jpg','Root/Z/10.jpg'),make('2.jpg','Root/Z/2.jpg'),make('1.jpg','Root/A/1.jpg')]);
  assert.deepEqual(f.map(x=>x.name),['A','Z']);assert.deepEqual(f[1].files.map(x=>x.name),['2.jpg','10.jpg']);
  assert.ok(naturalCompare('frame_2.jpg','frame_10.jpg')<0);
});
test('Root folder with direct stills creates one board; loose files do not group',()=>{
  const make=(name,path)=>Object.assign(new File(['abc'],name,{type:'image/jpeg'}),{webkitRelativePath:path});
  assert.equal(folderGroups([make('1.jpg','Root/1.jpg'),make('2.jpg','Root/2.jpg')])[0].name,'Root');
  assert.deepEqual(folderGroups([make('1.jpg','')]),[]);
});
test('Board names remain unique and exported ZIP names never collide',()=>{
  const boards=[board('Brand'),board('brand 2')];
  assert.equal(uniqueBoardName('brand',boards),'brand 3');
  assert.deepEqual(boardExportNames([board('My Board',[1]),board('My Board',[2]),board('My/Board',[3]),board('Empty')]),
    ['My_Board.jpg','My_Board_2.jpg','My_Board_3.jpg']);
  assert.equal(exportName('a/b'),'a_b');
});
test('Transferred stills are identified by collection and frame number',()=>{
  assert.equal(alreadyOnBoard({images:[{stillsSourceId:'video-A',stillsFrameNum:2}]},'video-A',2),true);
  assert.equal(alreadyOnBoard({images:[{stillsSourceId:'video-A',stillsFrameNum:2}]},'video-A',3),false);
});
test('Reject invalid still data before import',()=>{
  assert.throws(()=>validateStills([{id:'x',name:'x',frames:[{num:0,blob:new Blob(['x'])}]}]),/Invalid video frame/);
  assert.doesNotThrow(()=>validateStills([{id:'x',name:'x',frames:[{num:1,blob:new Blob(['x'])}]}]));
});
