/**
 * Stage existing static site for native packaging without changing source data or UI.
 * Execute from mobile/: npm run prepare:web
 */
import { cp, mkdir, readdir, rm, stat, lstat, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {guardMapHtml} from '../src/map-guard.mjs';
import {normalizeCatalog} from '../src/catalog.mjs';
import { fileURLToPath } from 'node:url';

const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(mobile, '..');
const target = path.resolve(mobile, 'www');
const extensions = new Set(['.html','.js','.css','.json','.webmanifest','.png','.jpg','.jpeg','.svg','.ico']);
const dirs = ['core','data'];
const mobileAssets = ['entry.html','catalog.html','plans.html'];
const checkOnly = process.argv.includes('--check');

async function verifyTree(dir) {
  for (const entry of await readdir(dir,{withFileTypes:true})) {
    const file = path.join(dir,entry.name);
    if (entry.isSymbolicLink()) throw Error('Symlink not permitted: '+file);
    if (entry.isDirectory()) await verifyTree(file);
    else if (!entry.isFile()) throw Error('Unsupported asset: '+file);
  }
}
async function main() {
  const index = await lstat(path.join(source,'index.html'));
  if (!index.isFile() || index.isSymbolicLink()) throw Error('Missing regular index.html');
  const files = [];
  for (const entry of await readdir(source,{withFileTypes:true})) {
    if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) {
      const info = await lstat(path.join(source,entry.name));
      if (!info.isFile() || info.isSymbolicLink()) throw Error('Unsafe root asset');
      files.push(entry.name);
    }
  }
  for (const dir of dirs) {
    if (!(await stat(path.join(source,dir))).isDirectory()) throw Error('Missing directory '+dir);
    await verifyTree(path.join(source,dir));
  }
  for (const file of mobileAssets) {
    const info = await lstat(path.join(mobile,file));
    if (!info.isFile() || info.isSymbolicLink()) throw Error('Missing safe mobile entry: '+file);
  }
  await verifyTree(path.join(mobile,'src'));
  // Validate the exact catalog shipped to web/native clients, including --check.
  // Do not silently discard unsourced or malformed rows during packaging.
  const catalogText = await readFile(path.join(mobile,'catalog.json'),'utf8');
  let catalogRows;
  try { catalogRows = JSON.parse(catalogText); }
  catch { throw Error('Invalid mobile/catalog.json JSON'); }
  const catalog = normalizeCatalog(catalogRows,{requireSource:true});
  if (catalog.rejected.length) throw Error('Invalid mobile catalog rows: '+catalog.rejected.map(r=>r.index+': '+r.reason).join('; '));
  if (checkOnly) {
    console.log('PASS: index, '+files.length+' root assets, '+dirs.join(', '));
    return;
  }
  await rm(target,{recursive:true,force:true});
  await mkdir(target,{recursive:true});
  for (const file of files) await cp(path.join(source,file),path.join(target,file));
  for (const dir of dirs) await cp(path.join(source,dir),path.join(target,dir),{recursive:true});
  const mapHtml = await readFile(path.join(target,'index.html'),'utf8');
  await writeFile(path.join(target,'map.html'),guardMapHtml(mapHtml));
  // Gate the simplified mountain map as well; keep its repository source untouched.
  const mountainHtml = await readFile(path.join(target,'mountain-trails.html'),'utf8');
  await writeFile(path.join(target,'mountain-trails.html'),guardMapHtml(mountainHtml));
  await cp(path.join(mobile,'entry.html'),path.join(target,'index.html'));
  await cp(path.join(mobile,'catalog.html'),path.join(target,'catalog.html'));
  await cp(path.join(mobile,'plans.html'),path.join(target,'plans.html'));
  await cp(path.join(mobile,'catalog.json'),path.join(target,'data','catalog.json'));
  await cp(path.join(mobile,'src'),path.join(target,'src'),{recursive:true});
  console.log('Prepared gated mobile entry and LNT-guarded map copy (original index unchanged). Online services still need internet.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
