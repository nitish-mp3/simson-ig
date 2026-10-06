let runtime;
let attempts = 0;

function chunkURL(path) {
  if (!/^\.\/chunks\/[a-zA-Z0-9_-]+\.js$/.test(path)) throw Error('Invalid Simson runtime asset');
  return new URL(path, import.meta.url).href;
}

async function latestAsset(kind) {
  const url = new URL('./runtime.json', import.meta.url);
  url.searchParams.set('retry', String(Date.now()));
  const response = await fetch(url, {cache:'no-store', signal:AbortSignal.timeout(5000)});
  if (!response.ok) throw Error('Simson release manifest is unavailable');
  const manifest = await response.json();
  return chunkURL(manifest[kind]);
}

export function loadRuntime() {
  if (runtime) return runtime;
  const attempt = ++attempts;
  runtime = (async()=>{
    try { return await import(chunkURL('__SIMSON_CARD_CHUNK__') + (attempt > 1 ? '?retry='+attempt : '')); }
    catch {
      const fresh = await latestAsset('runtime');
      return import(fresh + '?retry='+attempt);
    }
  })().catch(error=>{runtime=null;throw error;});
  return runtime;
}

export async function loadEditor() {
  try { await import(chunkURL('__SIMSON_EDITOR_CHUNK__')); }
  catch { await import(await latestAsset('editor')); }
}
