"""Convert the attributed SQLite data into a small runtime JSON index (no extra Python packages)."""
import sqlite3, json, gzip, pathlib, hashlib, urllib.request
root = pathlib.Path(__file__).resolve().parents[1] / 'storage' / 'dictionary'
source = root / 'dictionary_en_vi.db'
root.mkdir(parents=True, exist_ok=True)
base = 'https://raw.githubusercontent.com/skypediacode/english-vietnamese-dictionary/main/'
if not source.exists(): urllib.request.urlretrieve(base + source.name, source)
if hashlib.sha256(source.read_bytes()).hexdigest() != '2b65bea9577c2a4149caa90940c806f321d1c6cfac503ed8bbd9f93e43a0033a':
    raise SystemExit('Dictionary checksum mismatch; review upstream changes before updating.')
for name in ['LICENSE', 'ATTRIBUTION.md']:
    if not (root / name).exists(): urllib.request.urlretrieve(base + name, root / name)
db = sqlite3.connect(f'file:{source.as_posix()}?mode=ro', uri=True)
entries = {}
for word, meaning, pos, example, phonetic in db.execute('''
 SELECT w.word,d.definition,d.pos,wd.example,
 (SELECT p.ipa FROM pronunciations p WHERE p.word_id=w.id ORDER BY p.id LIMIT 1)
 FROM words w JOIN word_definitions wd ON wd.word_id=w.id
 JOIN definitions d ON d.id=wd.definition_id ORDER BY w.id,wd.id
'''):
    key = ' '.join(word.lower().split())
    values = entries.setdefault(key, [])
    if len(values) < 8:
        values.append({'word':word,'meaning':meaning,'partOfSpeech':pos or '', 'example':example or '', 'phonetic':phonetic or ''})
with gzip.open(root/'en-vi.json.gz','wt',encoding='utf-8') as output:
    json.dump(entries,output,ensure_ascii=False,separators=(',',':'))
print(json.dumps({'headwords':len(entries),'sha256':hashlib.sha256(source.read_bytes()).hexdigest()}))
