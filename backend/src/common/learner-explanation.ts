/** Keep importer provenance in storage; expose only the educational explanation. */
export function learnerExplanation(raw: string | null | undefined): string {
  let text = raw || '';
  text = text.split(/Nguồn\/mapping\s*:/i)[0]
    .replace(/\[(?:santa-ednet:[^\]]+|admin-question)\]\s*/g, '')
    .replace(/Độ khó khởi tạo, chưa hiệu chỉnh\.?/g, '');
  text = text.replace(/&#(x[0-9a-f]+|\d+);/gi, (match, value: string) => {
    const code = value[0].toLowerCase() === 'x' ? parseInt(value.slice(1),16) : Number(value);
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : match;
  }).replace(/&(nbsp|amp|quot|apos|lt|gt);/g, (_, key: string) => ({nbsp:' ',amp:'&',quot:'"',apos:"'",lt:'<',gt:'>'}[key] || ''));
  return text.replace(/^\s*(?:\*\*)?Giải thích\s*:\s*(?:\*\*)?\s*/i, '').trim();
}
