/**
 * Stage existing static site for native packaging without changing source data or UI.
 * Execute from mobile/: npm run prepare:web
 */
import { cp, mkdir, readdir, rm, stat, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(mobile, '..');
const target = path.resolve(mobile, 'www');
const extensions = new Set(['.html','.js','.css','.json','.webmanifest','.png','.jpg','.jpeg','.svg','.ico']);
const dirs = ['core','data'];
const mobileAssets = ['entry.html'];
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
  if (checkOnly) {
    console.log('PASS: index, '+files.length+' root assets, '+dirs.join(', '));
    return;
  }
  await rm(target,{recursive:true,force:true});
  await mkdir(target,{recursive:true});
  for (const file of files) await cp(path.join(source,file),path.join(target,file));
  for (const dir of dirs) await cp(path.join(source,dir),path.join(target,dir),{recursive:true});
  await cp(path.join(target,'index.html'),path.join(target,'map.html'));
  await cp(path.join(mobile,'entry.html'),path.join(target,'index.html'));
  await cp(path.join(mobile,'src'),path.join(target,'src'),{recursive:true});
  console.log('Prepared gated mobile entry and unchanged map.html. Online services still need internet.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
