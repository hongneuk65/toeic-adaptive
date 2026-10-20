// Convert source rich text into an allowlisted tree; never publish source HTML/scripts.
function renderNodes(node, { part, media, blanks = { value: 0 } }) {
  const context = { part, media, blanks };
  if (Array.isArray(node)) {
    if (typeof node[0] !== 'string') return node.flatMap(child => renderNodes(child, context));
    const [tag, attrs = {}] = node;
    if (tag === 'text') return typeof attrs.value === 'string' ? [{ type: 'text', text: attrs.value,
      ...(attrs.weight === '#w700' ? { bold: true } : {}), ...(attrs.underline ? { underline: true } : {}) }] : [];
    if (tag === 'blank') return [{ type: 'blank', number: part === 6 ? ++blanks.value : (attrs.number || ++blanks.value) }];
    if (tag === 'image') {
      const entry = media.resolve(attrs.src);
      return entry ? [{ type: 'image', url: entry.url, alt: attrs.alt || 'Tư liệu đề thi' }] : [];
    }
    if (tag === 'table') return [{ type: 'table', children: (attrs.body?.rows || []).map(row => ({ type: 'row',
      children: (row.cells || []).map(cell => ({ type: 'cell', colSpan: Math.max(1, Math.min(20, cell.colspan || 1)),
        rowSpan: Math.max(1, Math.min(20, cell.rowspan || 1)), children: renderNodes(cell.children || [], context) })) })) }];
    if (tag === 'paragraph') return [{ type: 'paragraph', children: renderNodes(attrs.children || [], context) }];
    return Object.values(attrs).filter(v => v && typeof v === 'object').flatMap(child => renderNodes(child, context));
  }
  if (node && typeof node === 'object') return Object.values(node).filter(v => v && typeof v === 'object').flatMap(child => renderNodes(child, context));
  return [];
}

function stimulusFor(q, set, blockTree, media) {
  const blanks = { value: 0 };
  const documents = set.passages.map((p, i) => ({ id: p.id || `document-${i + 1}`,
    blocks: renderNodes(blockTree(p.body), { part: Number(q.part.slice(1)), media, blanks })
  })).filter(doc => doc.blocks.length);
  return { version: 1, groupId: q.content_id, questionPosition: set.questions.findIndex(s => `q${s.id}` === q.question_id) + 1, documents };
}
module.exports = { renderNodes, stimulusFor };
