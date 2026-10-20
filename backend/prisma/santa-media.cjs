const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const mediaDirectory = () => path.resolve(__dirname, '../storage/exam');
function mediaIndex() {
  const crawler = process.env.SANTA_CRAWLER_DIR || path.resolve(__dirname, '../../../santa_crawler');
  const index = new Map();
  const urlKey = value => { try { const u = new URL(value); return u.hostname + u.pathname; } catch { return value; } };
  for (const relative of ['data/full/related', 'data/supplemental']) {
    const base = path.resolve(crawler, relative);
    const manifestPath = path.join(base, 'media_manifest.json');
    if (!fs.existsSync(manifestPath)) continue;
    const records = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    for (const r of records) {
      if (!r.path || !r.sha256) continue;
      const source = path.resolve(base, r.path.replaceAll('\\', '/'));
      if (!source.startsWith(base + path.sep) || !fs.existsSync(source)) continue;
      const extension = path.extname(source).toLowerCase();
      if (!['.mp3', '.wav', '.jpg', '.jpeg', '.png', '.webp'].includes(extension)) continue;
      const entry = { source, sha256: r.sha256, bytes: r.bytes,
        name: r.sha256 + extension, url: '/api/exam/media/' + r.sha256 + extension };
      if (r.url) index.set(urlKey(r.url), entry);
      if (r.source_path) index.set(r.source_path.replace(/^\/resource\//, ''), entry);
    }
    const resourcePath = path.join(base, 'resource_index.json');
    if (fs.existsSync(resourcePath)) {
      const resources = JSON.parse(fs.readFileSync(resourcePath, 'utf8'));
      for (const [id, item] of Object.entries(resources)) {
        const url = item.metadata?.success?.url || item.downloaded_file?.url;
        if (url && index.has(urlKey(url))) index.set(id, index.get(urlKey(url)));
      }
    }
  }
  return {
    resolve(ref) { return index.get(ref?.replace(/^riiid:\/\/resources\//, '')) || index.get(urlKey(ref)); },
    copy(entries) {
      fs.mkdirSync(mediaDirectory(), { recursive: true });
      let count = 0, bytes = 0;
      for (const entry of new Map(entries.map(e => [e.name, e])).values()) {
        const data = fs.readFileSync(entry.source);
        if (crypto.createHash('sha256').update(data).digest('hex') !== entry.sha256) throw new Error(`Media hash mismatch: ${entry.name}`);
        const dest = path.join(mediaDirectory(), entry.name);
        if (!fs.existsSync(dest)) fs.writeFileSync(dest, data, { flag: 'wx' });
        else if (crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex') !== entry.sha256) throw new Error(`Destination media differs: ${entry.name}`);
        count++; bytes += data.length;
      }
      return { files: count, bytes };
    },
  };
}
module.exports = { mediaIndex };
