// Build-time private assets. Never print credentials, signed URLs or content.
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { createHash } = require('node:crypto');
const { createReadStream, createWriteStream, mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { resolve, join, dirname, basename } = require('node:path');
const { tmpdir } = require('node:os');
const { Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { execFileSync } = require('node:child_process');

const root = resolve(__dirname, '..');
const allowed = /^(?:storage\/exam\/[a-f0-9]{64}\.(?:mp3|wav|jpg|jpeg|png|webp)|storage\/dictionary\/(?:en-vi\.json\.gz|LICENSE|ATTRIBUTION\.md)|models\/das3h-own-v1\.json|prisma\/public-library\.json\.gz|demo-assets\.manifest\.json)$/;
async function digest(path) {
  const hash = createHash('sha256');
  for await (const bytes of createReadStream(path)) hash.update(bytes);
  return hash.digest('hex');
}
(async () => {
  const expected = process.env.DEMO_ASSET_SHA256;
  if (!/^[a-f0-9]{64}$/.test(expected || '')) throw new Error('Verified asset archive digest required');
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  if (!endpoint || new URL(endpoint).protocol !== 'https:') throw new Error('HTTPS storage endpoint required');
  const bucket = process.env.MEDIA_S3_BUCKET;
  const key = process.env.DEMO_ASSET_KEY;
  if (!bucket || !key || !/^release\/[a-z0-9.-]+\.tar\.gz$/.test(key)) throw new Error('Private release location required');
  const temporary = mkdtempSync(join(tmpdir(), 'toeic-demo-assets-'));
  try {
    const archive = join(temporary, 'release.tar.gz');
    const client = new S3Client({ endpoint, region: process.env.AWS_REGION || 'us-east-1', forcePathStyle: true });
    const parts = Number(process.env.DEMO_ASSET_PARTS || 1);
    if (!Number.isInteger(parts) || parts < 1 || parts > 20) throw new Error('Invalid archive part count');
    const hash = createHash('sha256');
    let downloaded = 0;
    for (let index = 1; index <= parts; index++) {
      const partKey = parts === 1 ? key : `${key}.part${String(index).padStart(2, '0')}`;
      const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: partKey }));
      if (!response.Body || (response.ContentLength ?? 0) > 100 * 1024 * 1024) throw new Error('Invalid asset archive part');
      const tap = new Transform({ transform(chunk, _encoding, done) {
        downloaded += chunk.length;
        if (downloaded > 2_000_000_000) return done(new Error('Archive size exceeded'));
        hash.update(chunk); done(null, chunk);
      } });
      await pipeline(response.Body, tap, createWriteStream(archive, { flags: index === 1 ? 'w' : 'a' }));
    }
    if (hash.digest('hex') !== expected) throw new Error('Asset archive checksum mismatch');
    const files = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8', maxBuffer: 2_000_000 }).trim().split(/\r?\n/);
    if (!files.length || files.some(file => !allowed.test(file))) throw new Error('Unexpected archive path');
    const details = execFileSync('tar', ['-tvzf', archive], { encoding: 'utf8', maxBuffer: 2_000_000 }).trim().split(/\r?\n/);
    if (details.some(line => !line.startsWith('-'))) throw new Error('Only regular asset files are allowed');
    execFileSync('tar', ['-xzf', archive, '-C', root, '--no-same-owner', '--no-same-permissions']);
    const manifest = JSON.parse(readFileSync(join(root, 'demo-assets.manifest.json'), 'utf8'));
    if (!Array.isArray(manifest) || manifest.length !== files.length-1) throw new Error('Asset manifest count mismatch');
    const seen = new Set();
    for (const file of manifest) {
      if (!allowed.test(file.path) || seen.has(file.path) || !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error('Invalid manifest entry');
      seen.add(file.path);
      if (await digest(join(root, file.path)) !== file.sha256) throw new Error('Asset verification failed');
    }
    console.log(`Verified ${manifest.length} private release assets; no learner accounts imported.`);
  } finally {
    if (dirname(resolve(temporary)) === resolve(tmpdir()) && basename(temporary).startsWith('toeic-demo-assets-')) rmSync(temporary, { recursive: true, force: true });
  }
})().catch(() => { console.error('Private demo assets unavailable or verification failed. Check deployment configuration.'); process.exitCode = 1; });
