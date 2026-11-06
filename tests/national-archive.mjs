// Run: node tests/national-archive.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deflateRawSync} from 'node:zlib';
const html=readFileSync(new URL('../national.html',import.meta.url),'utf8');
assert(Number(html.match(/산박지도 v(\d+)/)?.[1])>=60);
for(const id of ['file','search','region','results','map','download'])assert(html.includes('id="'+id+'"'));
const script=html.split('<script>')[1]?.split('</script>')[0];
assert(script,'Browser script missing');
new Function(script);
function source(name){
 const found=script.indexOf('function '+name+'(');
 assert(found>=0,'Missing '+name);
 const start=script.slice(found-6,found)==='async '?found-6:found;
 const pos=script.indexOf('\n}',found);
 assert(pos>start,'Closing brace missing for '+name);
 return script.slice(start,pos+2);
}
const api=new Function("const decoder=new TextDecoder('utf-8');\n"+['eocd','central','readEntry'].map(source).join('\n')+"\nreturn {eocd,central,readEntry}")();
function zip(entries){
 const locals=[],dirs=[];let offset=0;
 for(const [name,content] of entries){
  const n=Buffer.from(name,'utf8'),raw=Buffer.from(content,'utf8'),compressed=deflateRawSync(raw);
  const local=Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(8,8);
  local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(raw.length,22);local.writeUInt16LE(n.length,26);
  const item=Buffer.concat([local,n,compressed]);locals.push(item);
  const dir=Buffer.alloc(46);
  dir.writeUInt32LE(0x02014b50,0);dir.writeUInt16LE(20,4);dir.writeUInt16LE(20,6);dir.writeUInt16LE(8,10);
  dir.writeUInt32LE(compressed.length,20);dir.writeUInt32LE(raw.length,24);dir.writeUInt16LE(n.length,28);dir.writeUInt32LE(offset,42);
  dirs.push(Buffer.concat([dir,n]));offset+=item.length;
 }
 const directory=Buffer.concat(dirs),end=Buffer.alloc(22);
 end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);
 end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...locals,directory,end]);
}
const index=JSON.stringify(Array.from({length:2932},(_,i)=>({code:String(i).padStart(9,'0'),name:'산 '+i,province:'서울'})));
const geojson=JSON.stringify({type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:[[127,37],[127.001,37.001]]}}]});
const file=new Blob([zip([['index.json',index],['geojson/000000001.geojson',geojson],['../../unsafe.json','{}']])]);
const info=api.eocd(await file.arrayBuffer());
const entries=api.central(await file.slice(info.offset,info.offset+info.size).arrayBuffer(),info.count);
assert.equal(entries.size,2,'Unsafe ZIP entries were included');assert(!entries.has('../../unsafe.json'));
const list=JSON.parse(new TextDecoder().decode(await api.readEntry(file,entries.get('index.json'))));
assert.equal(list.length,2932);assert.equal(list[1].name,'산 1');
const sample=JSON.parse(new TextDecoder().decode(await api.readEntry(file,entries.get('geojson/000000001.geojson'))));
assert.equal(sample.features[0].geometry.type,'LineString');
assert.throws(()=>api.eocd(new Uint8Array(40).buffer),/ZIP/);
console.log('PASS: v60 ZIP directory, 2,932-name catalog, lazy GeoJSON, traversal guard, browser JS');
