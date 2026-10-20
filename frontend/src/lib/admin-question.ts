export function questionOptions(part: string | number): string[] {
  return Number(part) === 2 ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'];
}

export function buildQuestionPayload(form: Record<string, string>): Record<string, unknown> {
  const part = Number(form.part);
  const options = questionOptions(part);
  if (!Number.isInteger(part) || part < 1 || part > 7) throw new Error('Chọn Part hợp lệ từ 1 đến 7.');
  if (!form.content?.trim()) throw new Error('Nhập nội dung câu hỏi.');
  for (const option of options) if (!form[`option${option}`]?.trim()) throw new Error(`Nhập phương án ${option}.`);
  if (!options.includes(form.correctAnswer)) throw new Error('Đáp án đúng phải thuộc các phương án của Part đã chọn.');
  const skillIds = [...new Set((form.skillIds || '').split(',').filter(Boolean).map(Number))];
  if (!skillIds.length || skillIds.some(id => !Number.isSafeInteger(id) || id < 1)) throw new Error('Chọn ít nhất một kỹ năng hợp lệ.');
  // Source IDs, source metadata and structured stimulus stay owned by the saved record.
  return Object.fromEntries([
    ['part', part], ['skillIds', skillIds],
    ...['content','passage','audioUrl','imageUrl','optionA','optionB','optionC','correctAnswer','explanation','difficulty'].map(key => [key, form[key] || '']),
    ['optionD', part === 2 ? '' : form.optionD || ''],
  ]);
}
