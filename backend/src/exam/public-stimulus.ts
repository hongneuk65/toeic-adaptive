// Publish the rendering contract only, never arbitrary JSON grading metadata.
export function publicStimulus(value: unknown, hideTranscript = false): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  function node(value: unknown, depth = 0, graphicalTable = false): Record<string, unknown> | null {
    if (depth > 30 || !value || typeof value !== 'object' || Array.isArray(value)) return null;
    const item = value as Record<string, unknown>;
    if (item.type === 'text') return hideTranscript && !graphicalTable ? null : {type: 'text', text: typeof item.text === 'string' ? item.text : '', bold: item.bold === true, underline: item.underline === true};
    if (item.type === 'blank') return hideTranscript && !graphicalTable ? null : {type: 'blank', number: typeof item.number === 'number' ? item.number : 0};
    if (item.type === 'image') return {type: 'image', url: typeof item.url === 'string' ? item.url : '', alt: typeof item.alt === 'string' && !hideTranscript ? item.alt : 'Tư liệu đề thi'};
    if (!['paragraph', 'table', 'row', 'cell', 'group'].includes(String(item.type))) return null;
    const children = Array.isArray(item.children) ? item.children.map(child => node(child, depth + 1, graphicalTable || item.type === 'table')).filter(Boolean) : [];
    if (hideTranscript && !children.length) return null;
    return {type: item.type, children, ...(item.type === 'cell' ? {colSpan: typeof item.colSpan === 'number' ? item.colSpan : 1, rowSpan: typeof item.rowSpan === 'number' ? item.rowSpan : 1} : {})};
  }
  return {
    version: 1, groupId: typeof source.groupId === 'string' ? source.groupId : '', questionPosition: typeof source.questionPosition === 'number' ? source.questionPosition : 1,
    ...(typeof source.audioDurationSeconds === 'number' ? {audioDurationSeconds: source.audioDurationSeconds} : {}),
    documents: Array.isArray(source.documents) ? source.documents.map((document, index) => {
      const doc = document && typeof document === 'object' ? document as Record<string, unknown> : {};
      return {id: typeof doc.id === 'string' ? doc.id : String(index), blocks: Array.isArray(doc.blocks) ? doc.blocks.map(block => node(block)).filter(Boolean) : []};
    }).filter(document => document.blocks.length) : [],
  };
}
