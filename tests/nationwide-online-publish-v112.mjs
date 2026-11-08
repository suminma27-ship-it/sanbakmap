import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const project=fileURLToPath(new URL('../',import.meta.url));
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const zip=read('data/nationwide-elevation-pack/nationwide-dem-v109.zip');
assert.equal(zip.length,1601782,'original vetted ZIP byte length');
assert.equal(createHash('sha256').update(zip).digest('hex'),
 '045cd0b4c41114f7a71b711b601445138a3ef9741a8ee4abaa6660f6e49c1e2e');
const dir=mkdtempSync(join(tmpdir(),'sanbak-online-v112-'));
try{
 const cmd=spawnSync('python',['tools/publish-nationwide-elevation-v110.py','--output-dir',dir],
  {cwd:project,encoding:'utf8',timeout:120000});
 assert.equal(cmd.status,0,cmd.stdout+'\n'+cmd.stderr);
 assert(cmd.stdout.includes('2723 mountain codes, 53034 edge samples'));
 const online=JSON.parse(readFileSync(join(dir,'online-v110.json'),'utf8'));
 assert.equal(online.schema,'sanbak-national-dem-online-v110');
 assert.equal(online.mountedMountains,2723);
 assert.equal(online.matchedEdges,53034);
 assert.equal(online.rasterResolutionVerified,false);
 assert.equal(online.verticalDatumVerified,false);
 assert.equal(online.accessVerified,false);
 assert.equal(Object.keys(online.mountains).length,2723);
 assert.equal(online.archiveSHA256,'045cd0b4c41114f7a71b711b601445138a3ef9741a8ee4abaa6660f6e49c1e2e');
 assert.equal(readdirSync(dir).filter(f=>/^bucket-\d\d\.json$/.test(f)).length,32);
 let mountains=0,edges=0;
 for(let i=0;i<32;i++){
  const id=String(i).padStart(2,'0');
  const d=JSON.parse(readFileSync(join(dir,'bucket-'+id+'.json'),'utf8'));
  assert.equal(d.schema,'sanbak-dem-bucket-v109');
  assert.equal(d.bucket,id);
  for(const [code,p] of Object.entries(d.mountains)){
   mountains++;
   assert.equal(p.mountainCode,code);
   assert.equal(p.sourceKind,'forest');
   assert.equal(p.accessVerified,false);
   assert.equal(p.graphArchiveSHA256,'7426dbf4bbf07ad31524a16eabe9dfad8f358a75ac519dcf3f09c4ebc178b76a');
   assert.equal(p.dem.resolutionMeters,null,'unverified raster resolution');
   const count=Object.keys(p.samples).length;
   edges+=count;
   assert.equal(Object.keys(p.edgeIdentities).length,count);
   assert.equal(online.mountains[code].bucket,id);
   assert.equal(online.mountains[code].matchedEdges,count);
  }
 }
 assert.equal(mountains,2723);
 assert.equal(edges,53034);
 for(const code of ['428302602','488605302','113050202','421504602','483100401'])
  assert(online.mountains[code]?.matchedEdges>0,'representative mountain not online: '+code);
 const sw=read('sw.js').toString(),page=read('nationwide-plan.html').toString();
 assert(sw.includes('sanbakmap-v112-national-elevation-online'));
 assert(sw.includes("url.pathname.endsWith('/data/nationwide-elevation/online-v110.json')"));
 assert(sw.includes("fetch(req, {cache:'no-store'})"));
 assert(page.includes('산박지도 v112 | 전국 고도그래프 온라인'));
 assert(page.includes('id="localElevationUpload"'));
 assert(page.includes('onlineElevationBuckets.set(bucketId'));
 assert(page.includes("onlineElevationIndex=await json('./data/nationwide-elevation/online-v110.json')"));
 new Function(page.slice(page.lastIndexOf('<script>')+8,page.lastIndexOf('</script>')));
 console.log('PASS v112 national online deployment: 32 DEM buckets; 2723 mountain codes; 53034 source edges; 5 representative mountains; no claimed raster metadata');
}finally{rmSync(dir,{recursive:true,force:true})}
