export function ListeningCloze({ tokens, values, disabled, onChange }: { tokens: string[]; values: Record<number, string>; disabled: boolean; onChange(index: number, value: string): void }) {
  let blank = 0;
  return <div className="listening-cloze" role="group" aria-label="Điền từ vào chỗ trống">
    {tokens.map((token, index) => token === '____' ? <input key={index} aria-label={`Từ còn thiếu ${++blank}`} value={values[index] || ''} onChange={event => onChange(index, event.target.value.replace(/\s/g, ''))} disabled={disabled} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={60} placeholder="____" style={{ width: `${Math.min(20, Math.max(7, (values[index]?.length || 0) + 2))}ch` }} /> : <span key={index}>{token}</span>)}
  </div>;
}
