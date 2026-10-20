import { lookupDictionary } from './local-dictionary';
import { existsSync } from 'node:fs';
const installed=existsSync('storage/dictionary/en-vi.json.gz');
(installed ? describe : describe.skip)('installed English Vietnamese dictionary',()=>{
 it('finds words beyond the imported flashcard library',async()=>{
 for(const word of ['meticulous','unprecedented','reimburse']) {
 const entries=await lookupDictionary([word]);expect(entries.length).toBeGreaterThan(0);expect(entries[0].meaning).toBeTruthy();
 }
 expect(await lookupDictionary(['zzzzimaginaryunknownword'])).toEqual([]);
 });
});
