import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync, brotliDecompressSync} from 'node:zlib';

test('every published asset has matching compressed representations', async () => {
  for (const directory of ['../custom_components/simson/www/', '../www/']) {
    const root = new URL(directory, new URL('../', import.meta.url));
    const manifest = JSON.parse(await readFile(new URL('runtime.json', root), 'utf8'));
    for (const name of ['simson-card.js', 'runtime.json', ...manifest.assets,
      ...(directory === '../www/' ? ['simson-call-card.js'] : [])]) {
      const plain = await readFile(new URL(name, root));
      assert.deepEqual(gunzipSync(await readFile(new URL(name + '.gz', root))), plain, name + ' gzip');
      assert.deepEqual(brotliDecompressSync(await readFile(new URL(name + '.br', root))), plain, name + ' brotli');
    }
  }
});
