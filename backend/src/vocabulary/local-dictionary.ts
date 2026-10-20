import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { resolve } from 'node:path';
export interface DictionaryEntry {word:string;meaning:string;phonetic:string;example:string;partOfSpeech?:string}
let dictionary:Promise<Record<string,DictionaryEntry[]>>|undefined;
export async function lookupDictionary(variants:string[]):Promise<DictionaryEntry[]> {
  dictionary ??= readFile(resolve(process.env.VOCABULARY_DICTIONARY_PATH || 'storage/dictionary/en-vi.json.gz'))
    .then(bytes=>JSON.parse(gunzipSync(bytes).toString('utf8')) as Record<string,DictionaryEntry[]>);
  try {
    const data=await dictionary;
    for(const word of variants)if(Object.hasOwn(data,word))return data[word];
    return [];
  } catch {dictionary=undefined;throw new Error('DICTIONARY_UNAVAILABLE');}
}
