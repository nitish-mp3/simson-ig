import { build } from 'esbuild';
import { mkdir, writeFile, readdir, readFile, rm, copyFile } from 'node:fs/promises';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { VERSION } from './src/version.js';

const root = path.dirname(fileURLToPath(import.meta.url));
async function writeAsset(filename, contents) {
  await writeFile(filename, contents);
  await writeFile(filename + '.gz', gzipSync(contents));
  await writeFile(filename + '.br', brotliCompressSync(contents));
}
const out = path.resolve(root, '../custom_components/simson/www');
const options = {absWorkingDir:root,bundle:true,format:'esm',target:['es2022'],minify:true,legalComments:'none',metafile:true,write:false,outdir:out};
const runtime = await build({...options,entryPoints:{card:'src/card.js',editor:'src/editor.js',rooms:'src/room-settings.js',screen:'src/room-display-card.js',source:'src/room-source-card.js',camera:'src/transport/ha-camera-source.js'},splitting:true,loader:{'.css':'text'},entryNames:'chunks/[name]-[hash]',chunkNames:'chunks/[name]-[hash]'});
const asset = source => {
  const output = Object.entries(runtime.metafile.outputs).find(([,value])=>value.entryPoint===source);
  if(!output)throw Error('Missing runtime asset: '+source);
  return './chunks/'+path.basename(output[0]);
};
const bootstrap = await build({...options,entryPoints:{'simson-card':'src/entry.js'},splitting:false});
const entry = bootstrap.outputFiles[0];
entry.contents = Buffer.from(entry.text.replaceAll('__SIMSON_CARD_CHUNK__',asset('src/card.js')).replaceAll('__SIMSON_EDITOR_CHUNK__',asset('src/editor.js')).replaceAll('__SIMSON_ROOMS_CHUNK__',asset('src/room-settings.js')).replaceAll('__SIMSON_ROOM_DISPLAY_CHUNK__',asset('src/room-display-card.js')).replaceAll('__SIMSON_ROOM_SOURCE_CHUNK__',asset('src/room-source-card.js')));
if(entry.contents.length>14000)throw Error('Registration bundle exceeds 14 KB budget');
const files = [...bootstrap.outputFiles,...runtime.outputFiles];
const castScreen = await build({...options,entryPoints:{'simson-cast-room-screen':'src/cast-screen-entry.js'},splitting:false,target:['chrome80']});
files.push(...castScreen.outputFiles);
const assets = runtime.outputFiles.map(file=>path.relative(out,file.path).split(path.sep).join('/'));
for(const base of [out,path.resolve(root,'../www')]) {
  await mkdir(path.join(base,'chunks'),{recursive:true});
  let previous;
  try {previous=JSON.parse(await readFile(path.join(base,'runtime.json'),'utf8'));} catch {}
  const oldFiles=(await readdir(path.join(base,'chunks'))).filter(name=>/\.js(?:\.(?:gz|br))?$/.test(name)).map(name=>'chunks/'+name);
  const retained=previous ? previous.version===VERSION ? previous.previous_assets || [] : previous.assets || [] : oldFiles;
  const keep=new Set([...assets,...retained]);
  for(const old of oldFiles)if(!keep.has(old.replace(/\.(gz|br)$/,'')))await rm(path.join(base,old));
  for(const file of files)await writeAsset(path.join(base,path.relative(out,file.path)),file.contents);
  await writeAsset(path.join(base,'runtime.json'),JSON.stringify({version:VERSION,runtime:asset('src/card.js'),editor:asset('src/editor.js'),camera:asset('src/transport/ha-camera-source.js'),assets,previous_assets:retained})+'\n');
}
await copyFile(path.join(out,'simson-card.js'),path.resolve(root,'../www/simson-call-card.js'));
for (const suffix of ['.gz', '.br']) await copyFile(path.join(out,'simson-card.js' + suffix),path.resolve(root,'../www/simson-call-card.js' + suffix));
await writeFile(path.join(root,'bundle-report.json'),JSON.stringify(Object.fromEntries(files.map(file=>[path.relative(out,file.path).split(path.sep).join('/'),{bytes:file.contents.length,gzip:gzipSync(file.contents).length}])),null,2)+'\n');
console.log(`Registration bundle: ${entry.contents.length} bytes (${gzipSync(entry.contents).length} gzip)`);
