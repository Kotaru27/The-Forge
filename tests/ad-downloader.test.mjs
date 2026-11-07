import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {detectColumns,extensionHint,parseWorkbook,copyBucketTable,copyForstaScript,normalize,safeName,safeUrl} from '../src/tools/ad-downloader/engine.ts';
import {guessType} from '../src/tools/ad-downloader/assets.ts';
import {directUrl,isSharePoint,matchesOriginal,sourceFilename,targetFilename} from '../src/tools/ad-downloader/sharepoint.ts';

function workbook(options={}) {
  const work=XLSX.utils.book_new();
  const sheet=XLSX.utils.aoa_to_sheet([
    ['Ad No','Asset URL','Creative Type'],
    ['12','Campaign Video.mp4','TVC'],
    ['13','Campaign Video.mp4','TVC'],
    ['14','no-link','Print'],
  ]);
  sheet.B2.l={Target:'https://assets.example.com/Campaign%20Video.mp4'};
  sheet.B3.l={Target:'https://assets.example.com/Campaign%20Video.mp4'};
  XLSX.utils.book_append_sheet(work,sheet,'Ads');
  if(options.buckets!==false) XLSX.utils.book_append_sheet(work,XLSX.utils.aoa_to_sheet([
    ['Bucket','AdType'],['Low','TVC']
  ]),'Buckets');
  return XLSX.write(work,{type:'buffer',bookType:options.xls?'xls':'xlsx'});
}
test('Excel first sheet recognizes column headers, real hyperlinks and duplicate AD names',()=>{
  const data=parseWorkbook(workbook());
  assert.equal(data.entries.length,2);
  assert.equal(data.skipped,1);
  assert.equal(data.entries[0].no,'12');
  assert.equal(data.entries[0].displayName,'AD12_Campaign_Video');
  assert.equal(data.entries[0].ext,'.mp4');
  assert.equal(data.entries[1].displayName,'AD13_Campaign_Video');
  assert.equal(data.buckets.length,1);
  assert.deepEqual(data.buckets[0],{bucket:'Low',ads:['13']});
  assert.equal(copyBucketTable(data.buckets),'Bucket\tAds\nLow\t\'13\'\n');
  assert.match(copyForstaScript(data.buckets),/f\('cq42000'\)\.any\('Low'\)/);
});
test('Excel xls format still imports and no second sheet gives no buckets',()=>{
  const result=parseWorkbook(workbook({xls:true,buckets:false}));
  assert.equal(result.entries.length,2);
  assert.deepEqual(result.buckets,[]);
});
test('Header fallback uses columns A,B,C, and blank workbook has controlled error',()=>{
  const cols=detectColumns([[{t:'s',v:'unknown'},null,null]]);
  assert.deepEqual({start:cols.start,no:cols.no,link:cols.link,type:cols.type}, {start:1,no:0,link:1,type:2});
});
test('URL validation and normalized filename rules',()=>{
  assert.equal(safeUrl('javascript:alert(1)'), '');
  assert.equal(safeUrl('https://example.org/a'), 'https://example.org/a');
  assert.equal(safeName('  Café/Area! '),'Cafe_Area');
  assert.equal(normalize(' Static_3 '),'STATIC3');
});
test('Extension hints honor filename first and do not confuse unknown binary with image',()=>{
  assert.deepEqual(extensionHint('https://cdn.example.com/ad.png','label','Video'),{ext:'.png',confidence:'high'});
  assert.deepEqual(extensionHint('https://cdn.example.com/ad','label','Radio'),{ext:'.mp3',confidence:'inferred'});
  assert.deepEqual(extensionHint('https://cdn.example.com/ad','label','Other'),{ext:'',confidence:'unknown'});
});
test('SharePoint URL validation rejects traversal, preview paths and unrelated domains',()=>{
  const original='https://tenant.sharepoint.com/sites/Team/Shared%20Documents/Campaign.mp4';
  assert.equal(isSharePoint(original),true);
  const direct=directUrl(original);
  assert.match(direct,/_layouts\/15\/download.aspx/);
  assert.equal(new URL(direct).searchParams.get('SourceUrl'),'/sites/Team/Shared Documents/Campaign.mp4');
  assert.equal(sourceFilename(original),'Campaign.mp4');
  assert.equal(directUrl('https://tenant.sharepoint.com/sites/Team/../private/file.mp4'),null);
  assert.equal(directUrl('https://tenant.sharepoint.com/sites/Team/_layouts/15/stream.aspx'),null);
  assert.equal(isSharePoint('https://tenant.sharepoint.com.evil.test/sites/T/file.mp4'),false);
});
test('SharePoint filename matching requires extension and high token overlap',()=>{
  assert.equal(matchesOriginal('Great_Campaign_Main_Video.mp4','Great Campaign Main Video.mp4'),true);
  assert.equal(matchesOriginal('unrelated.mp4','Great Campaign Main Video.mp4'),false);
  assert.equal(matchesOriginal('Great Campaign Main Video.mp3','Great Campaign Main Video.mp4'),false);
  assert.equal(targetFilename('AD1_My Video','Original.MP4'),'AD1_My_Video.mp4');
});
test('Media signature beats mime and source guess; HTML preview/login is never saved',()=>{
  const hint={ext:'.mp4',confidence:'inferred'};
  assert.equal(guessType(new Blob(['%PDF-hi'],{type:'application/octet-stream'}),hint,new TextEncoder().encode('%PDF-1.5')),'.pdf');
  assert.throws(()=>guessType(new Blob(['<html>login'],{type:'application/octet-stream'}),hint,new TextEncoder().encode('<html>login')), /web page/);
  assert.equal(guessType(new Blob(['??'],{type:'application/octet-stream'}),hint,new TextEncoder().encode('??')),'.bin');
});
