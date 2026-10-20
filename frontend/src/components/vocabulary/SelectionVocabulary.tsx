import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../../lib/api';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { selectedVocabularyText, vocabularyAnchor, vocabularyRouteAllowed } from '../../lib/selection-vocabulary';
import '../../styles/selection-vocabulary.css';

interface SelectionEntry { word: string; context: string; left: number; top: number }
interface DictionaryEntry { word: string; meaning: string; phonetic?: string; example?: string; partOfSpeech?: string; source: string }
interface Lookup { word: string; found: boolean; entries: DictionaryEntry[]; dictionaryAvailable?: boolean }
interface Folder { id: number | string; name: string; isOwner: boolean }
interface Saved { folderId: number; alreadySaved: boolean; card: { id: number; word: string; meaning: string } }

export function SelectionVocabulary({ source }: { source: string }) {
  const [selection, setSelection] = useState<SelectionEntry | null>(null);
  const [opened, setOpened] = useState<SelectionEntry | null>(null);
  useEffect(() => {
    if (!vocabularyRouteAllowed(source)) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const capture = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('[data-selection-vocabulary]')) return;
      if (target?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])')) { setSelection(null); return; }
      clearTimeout(timer);
      timer = setTimeout(() => {
        const current = window.getSelection();
        const root = document.getElementById('learning-main');
        if (!current?.rangeCount || current.isCollapsed || !root) { setSelection(null); return; }
        const range = current.getRangeAt(0);
        const start = range.startContainer.parentElement;
        const end = range.endContainer.parentElement;
        const excluded = 'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[data-selection-vocabulary]';
        if (!root.contains(range.startContainer) || !root.contains(range.endContainer) || start?.closest(excluded) || end?.closest(excluded)) { setSelection(null); return; }
        const word = selectedVocabularyText(current.toString());
        if (!word) { setSelection(null); return; }
        const rect = range.getBoundingClientRect();
        if (!rect.width && !rect.height) return;
        const contextNode = start?.closest('p,li,td,blockquote,h1,h2,h3,article');
        const context = (contextNode?.textContent || word).replace(/\s+/g,' ').trim().slice(0,1000);
        setSelection({word,context,...vocabularyAnchor(rect,window.innerWidth,window.innerHeight)});
      }, 0);
    };
    const dismiss = (event: KeyboardEvent) => { if(event.key==='Escape') setSelection(null); };
    const scroll = () => setSelection(null);
    document.addEventListener('mouseup',capture);
    document.addEventListener('touchend',capture);
    document.addEventListener('keyup',capture);
    document.addEventListener('keydown',dismiss);
    window.addEventListener('scroll',scroll,true);
    window.addEventListener('resize',scroll);
    return () => {clearTimeout(timer);document.removeEventListener('mouseup',capture);document.removeEventListener('touchend',capture);document.removeEventListener('keyup',capture);document.removeEventListener('keydown',dismiss);window.removeEventListener('scroll',scroll,true);window.removeEventListener('resize',scroll);};
  }, [source]);
  if (!vocabularyRouteAllowed(source)) return null;
  return createPortal(<div data-selection-vocabulary>
    {selection && !opened && <button className="selection-vocabulary-action" style={{left:selection.left,top:selection.top}} onMouseDown={event => event.preventDefault()} onClick={() => {setOpened(selection);setSelection(null);}}>Tra từ / lưu từ</button>}
    {opened && <VocabularyDialog initial={opened} source={source} onClose={() => setOpened(null)} />}
  </div>,document.body);
}

function VocabularyDialog({ initial, source, onClose }: { initial: SelectionEntry; source: string; onClose(): void }) {
  const [word,setWord] = useState(initial.word);
  const [meaning,setMeaning] = useState('');
  const [phonetic,setPhonetic] = useState('');
  const [example,setExample] = useState(initial.context);
  const [folderId,setFolderId] = useState('');
  const [folders,setFolders] = useState<Folder[]>([]);
  const [foldersError,setFoldersError] = useState('');
  const [entries,setEntries] = useState<DictionaryEntry[] | null>(null);
  const [lookupBusy,setLookupBusy] = useState(true);
  const [lookupError,setLookupError] = useState('');
  const [saveError,setSaveError] = useState('');
  const [saving,setSaving] = useState(false);
  const [saved,setSaved] = useState<Saved | null>(null);
  const lookupController = useRef<AbortController | null>(null);
  const saveController = useRef<AbortController | null>(null);
  const saveLock = useRef(false);
  const dialog = useRef<HTMLDivElement>(null);
  useDialogFocus(dialog,true,() => {if(!saveLock.current) onClose();});
  const apply = (entry: DictionaryEntry) => {setMeaning(entry.meaning);setPhonetic(entry.phonetic || '');if(!example.trim()) setExample(entry.example || '');};
  const lookup = async (value: string, explain = false) => {
    const normalized = selectedVocabularyText(value);
    if (!normalized) {setLookupError('Chọn từ hoặc cụm từ tối đa 120 ký tự và 12 từ.');return;}
    lookupController.current?.abort();
    const controller = new AbortController();lookupController.current=controller;
    setLookupBusy(true);setLookupError('');setEntries(null);
    try {
      const result = explain
        ? await api<DictionaryEntry>('/vocabulary/explain',{method:'POST',data:{word:normalized,context:initial.context},signal:controller.signal}).then(entry => ({word:normalized,found:true,entries:[entry]}))
        : await api<Lookup>(`/vocabulary/lookup?word=${encodeURIComponent(normalized)}`,{signal:controller.signal});
      if(controller.signal.aborted) return;
      setEntries(result.entries);
      if ('dictionaryAvailable' in result && result.dictionaryAvailable === false) setLookupError('Từ điển hiện chưa sẵn sàng. Vui lòng thử lại sau.');
      const first=result.entries[0];
      if(first) {setMeaning(current => current || first.meaning);setPhonetic(current => current || first.phonetic || '');}
    } catch(cause) {if(!controller.signal.aborted) setLookupError(getErrorMessage(cause,'Chưa tra được từ. Bạn có thể nhập nghĩa để lưu.'));}
    finally {if(!controller.signal.aborted) setLookupBusy(false);}
  };
  useEffect(() => {
    const controller = new AbortController();
    void api<Folder[]>('/flashcards/folders',{signal:controller.signal}).then(value => {if(!controller.signal.aborted) setFolders(value.filter(folder => folder.isOwner));}).catch(cause => {if(!controller.signal.aborted) setFoldersError(getErrorMessage(cause));});
    return () => {controller.abort();lookupController.current?.abort();saveController.current?.abort();};
  },[]);
  useEffect(() => {
    const controller = new AbortController();lookupController.current=controller;
    void api<Lookup>(`/vocabulary/lookup?word=${encodeURIComponent(initial.word)}`,{signal:controller.signal}).then(result => {
      if(controller.signal.aborted) return;
      setEntries(result.entries);
      if ('dictionaryAvailable' in result && result.dictionaryAvailable === false) setLookupError('Từ điển hiện chưa sẵn sàng. Vui lòng thử lại sau.');
      const first=result.entries[0];
      if(first) {setMeaning(current => current || first.meaning);setPhonetic(current => current || first.phonetic || '');}
    }).catch(cause => {if(!controller.signal.aborted) setLookupError(getErrorMessage(cause));}).finally(() => {if(!controller.signal.aborted) setLookupBusy(false);});
    return () => controller.abort();
  },[initial.word]);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if(saveLock.current || saved) return;
    const normalized=selectedVocabularyText(word);
    if(!normalized || !meaning.trim()) {setSaveError('Nhập từ/cụm từ hợp lệ và nghĩa tiếng Việt trước khi lưu.');return;}
    lookupController.current?.abort();setLookupBusy(false);
    saveLock.current=true;setSaving(true);setSaveError('');
    const controller=new AbortController();saveController.current=controller;
    try {const result=await api<Saved>('/vocabulary/save',{method:'POST',signal:controller.signal,data:{word:normalized,meaning:meaning.trim(),phonetic:phonetic.trim() || undefined,example:example.trim() || undefined,folderId:folderId ? Number(folderId) : undefined,source}});if(!controller.signal.aborted) setSaved(result);}
    catch(cause) {if(!controller.signal.aborted) setSaveError(getErrorMessage(cause));}
    finally {saveLock.current=false;if(!controller.signal.aborted) setSaving(false);}
  };
  return <div className="selection-vocabulary-backdrop"><div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="selection-vocabulary-title" tabIndex={-1} className="selection-vocabulary-dialog">
    <header className="selection-vocabulary-header"><div><p>TỪ VỰNG CỦA BẠN</p><h2 id="selection-vocabulary-title">Tra từ & lưu để ôn</h2></div><button type="button" disabled={saving} onClick={onClose} aria-label="Đóng cửa sổ từ vựng">×</button></header>
    {saved ? <div className="selection-vocabulary-body"><div role="status" className="selection-vocabulary-success"><strong>{saved.alreadySaved ? 'Từ đã có trong sổ của bạn.' : 'Đã lưu từ vào sổ của bạn.'}</strong><p>{saved.card.word} · {saved.card.meaning}</p></div><Link className="primary-button" to={`/flashcards/${saved.folderId}`} onClick={onClose}>Mở thư mục để ôn</Link><button className="secondary-button" onClick={onClose}>Tiếp tục học</button></div> : <form onSubmit={save}><div className="selection-vocabulary-body">
      <fieldset disabled={saving} className="selection-vocabulary-fields"><label>Từ hoặc cụm từ<div className="selection-vocabulary-lookup"><input value={word} maxLength={120} required onChange={event => {lookupController.current?.abort();setWord(event.target.value);setMeaning('');setPhonetic('');setEntries(null);setLookupBusy(false);setLookupError('');}} autoComplete="off" /><button type="button" disabled={lookupBusy || !word.trim()} onClick={() => void lookup(word)}>Tra lại</button></div></label>
      {lookupBusy && <p role="status" className="selection-vocabulary-note">Đang tra từ điển Anh – Việt…</p>}
      {lookupError && <p role="alert" className="selection-vocabulary-note">{lookupError} Bạn vẫn có thể nhập nghĩa bên dưới để lưu.</p>}
      {entries && entries.length===0 && <p role="status" className="selection-vocabulary-note">Từ điển chưa có mục từ này. Với cụm từ hoặc tên riêng, bạn có thể dùng AI để giải nghĩa theo ngữ cảnh.</p>}
      {entries && entries.length>0 && <div className="selection-vocabulary-entries">{entries.slice(0,5).map((entry,index) => <button type="button" key={`${entry.source}-${index}`} onClick={() => apply(entry)} aria-pressed={meaning===entry.meaning}><span>{entry.source==='DICTIONARY' ? `Từ điển Anh – Việt · ${entry.word}` : entry.source==='AI' ? 'AI · cần kiểm tra' : entry.source==='SANTA' ? 'Nguồn học Santa' : entry.source==='PERSONAL' ? 'Từ vựng của bạn' : 'Từ vựng công khai'}</span><strong>{entry.meaning}</strong>{(entry.phonetic || entry.partOfSpeech) && <em>{[entry.partOfSpeech, entry.phonetic].filter(Boolean).join(' · ')}</em>}<small>{meaning===entry.meaning ? '✓ Đang chọn nghĩa này' : 'Dùng nghĩa này'}</small></button>)}</div>}
      <p className="selection-vocabulary-note">Từ điển: <a href="https://github.com/skypediacode/english-vietnamese-dictionary" target="_blank" rel="noreferrer">Skypedia / MinhQND</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>. Ví dụ trong nguồn có thể do AI bổ sung.</p>
      <button className="selection-vocabulary-ai" type="button" disabled={lookupBusy || !word.trim()} onClick={() => void lookup(word,true)}>Giải nghĩa bằng AI</button>
      <label>Nghĩa tiếng Việt<textarea rows={3} maxLength={5000} required value={meaning} onChange={event => setMeaning(event.target.value)} placeholder="Nhập hoặc chỉnh lại nghĩa phù hợp ngữ cảnh…" /></label>
      <label>Phiên âm <span className="selection-vocabulary-optional">· tùy chọn</span><input value={phonetic} maxLength={500} onChange={event => setPhonetic(event.target.value)} /></label>
      <label>Ví dụ / ngữ cảnh<textarea rows={3} maxLength={1800} value={example} onChange={event => setExample(event.target.value)} /></label>
      <label>Lưu vào thư mục<select value={folderId} onChange={event => setFolderId(event.target.value)}><option value="">Từ vựng đã tra · sổ cá nhân</option>{folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label>
      {foldersError && <p className="selection-vocabulary-note">Chưa tải được danh sách thư mục. Bạn vẫn có thể lưu vào sổ cá nhân mặc định.</p>}
      </fieldset>{saveError && <p role="alert" className="selection-vocabulary-error">{saveError}</p>}
    </div><footer className="selection-vocabulary-footer"><button type="button" className="secondary-button" disabled={saving} onClick={onClose}>Hủy</button><button className="primary-button" disabled={saving || !meaning.trim() || !word.trim()}>{saving ? 'Đang lưu…' : 'Lưu từ vựng'}</button></footer></form>}
  </div></div>;
}
