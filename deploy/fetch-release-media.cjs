const { readFileSync, mkdirSync, writeFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const rows = JSON.parse(readFileSync('media-manifest.json', 'utf8'));
const hosts = new Set(['toeic-compass.up.railway.app']);
mkdirSync('/media', { recursive: true });
let cursor = 0, completed = 0;
async function worker() {
  while (cursor < rows.length) {
    const row = rows[cursor++];
    if (!/^[a-f0-9]{64}\.(mp3|wav|jpg|jpeg|png|webp)$/.test(row.name)) throw new Error('Invalid media name');
    const url = new URL(row.url);
    if (url.protocol !== 'https:' || !hosts.has(url.hostname)) throw new Error('Unexpected media host');
    let success = false;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(60000), redirect: 'error' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        if (createHash('sha256').update(bytes).digest('hex') !== row.sha256) throw new Error('SHA256 mismatch');
        writeFileSync(`/media/${row.name}`, bytes);
        success = true; break;
      } catch { await new Promise(r => setTimeout(r, (attempt + 1) * 1500)); }
    }
    if (!success) throw new Error(`Media could not be verified: ${row.name}`);
    if (++completed % 100 === 0) console.log(`Verified media ${completed}/${rows.length}`);
  }
}
Promise.all(Array.from({ length: 8 }, worker)).then(() => console.log(`Verified ${completed} public source assets`)).catch(e => { console.error(e.message); process.exitCode = 1; });
