import { build } from 'esbuild';
import { mkdir, writeFile, readdir, rm, copyFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(root, '../custom_components/simson/www');
const result = await build({absWorkingDir:root,entryPoints:{'simson-card':'src/entry.js'},bundle:true,splitting:true,format:'esm',target:['es2022'],minify:true,legalComments:'none',loader:{'.css':'text'},outdir:out,chunkNames:'chunks/[name]-[hash]',metafile:true,write:false});
const entry = result.outputFiles.find(file => file.path.endsWith('simson-card.js'));
const cardOutput = Object.entries(result.metafile.outputs).find(([,output]) => output.entryPoint === 'src/card.js');
if (!cardOutput) throw new Error('Missing card runtime chunk');
const cardPath = './chunks/' + path.basename(cardOutput[0]);
entry.contents = Buffer.from(entry.text.replace('__SIMSON_CARD_CHUNK__', cardPath));
if (entry.contents.length > 12000) throw new Error('Registration bundle exceeds 12 KB budget');
for (const base of [out, path.resolve(root,'../www')]) {
  await mkdir(path.join(base,'chunks'),{recursive:true});
  for (const old of await readdir(path.join(base,'chunks'))) if(old.endsWith('.js')) await rm(path.join(base,'chunks',old));
  for(const file of result.outputFiles) {
    const relative = path.relative(out,file.path);
    await writeFile(path.join(base,relative),file.contents);
  }
}
await copyFile(path.join(out,'simson-card.js'),path.resolve(root,'../www/simson-call-card.js'));
await writeFile(path.join(root,'bundle-report.json'),JSON.stringify(Object.fromEntries(result.outputFiles.map(file=>[path.relative(out,file.path).split(path.sep).join('/'),{bytes:file.contents.length,gzip:gzipSync(file.contents).length}])),null,2)+'\n');
console.log(`Registration bundle: ${entry.contents.length} bytes (${gzipSync(entry.contents).length} gzip)`);
