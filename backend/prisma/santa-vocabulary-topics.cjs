// Editorial grouping rules; semantic topics are inferred, not supplied by Santa.
const DEFINITIONS = [
  ['employment', 'Nhân sự & tuyển dụng', 'applicant|candidate|employee|personnel|payroll|hire|recruit|retire|qualified|qualify|compensate|appraisal|commensurate|proficiency|nominate|nomination|supervise|assignment|absentee|absence|competent|dedication|incentive', 'employee|employees|applicant|applicants|candidate|candidates|hiring|recruitment|interview|salary|salaries|staff|personnel|payroll|resume'],
  ['finance', 'Tài chính & thanh toán', 'accrue|asset|bankrupt|bill|calculate|charge|deduct|expenditure|expense|financial|fiscal|invoice|profit|rebate|receipt|reimburse|revenue|transaction|withdraw|sum|rate|sales figures|account for', 'bank|banking|budget|payment|payments|invoice|invoices|financial|finance|revenue|profit|profits|tax|taxes|accounting|refund'],
  ['travel', 'Du lịch & giao thông', 'accommodation|arrive|attraction|baggage|commute|crew|depart|destination|detour|direct flight|dock|fare|fuel-efficiency|garage|itinerary|motorist|overseas|passport|pedestrian|platform|route|scenic|sightseeing|stopover|tow|travel agency|vehicle|walkway|wing', 'airport|airline|flight|flights|passenger|passengers|train|trains|bus|buses|traffic|travel|trip|tour|tours|ticket|tickets'],
  ['hospitality', 'Nhà hàng & khách sạn', 'banquet|caterer|catering|chef|chop|cuisine|dairy product|diner|entree|flavor|freshness|grain|grocery|hospitality|ingredient|inn|lodge|nutrition|perishable|refreshment|refrigerated|silverware|spoil|tray', 'restaurant|restaurants|hotel|hotels|meal|meals|dinner|lunch|breakfast|menu|menus|food|cuisine|chef|kitchen'],
  ['sales', 'Mua sắm & bán hàng', 'affordable|assorted|browse|client|competitive|complimentary|customize|demand|emporium|exclusive|expensive|inventory|merchandise|out of stock|patron|patronage|patronize|purchase|retail|special offer|stock|supplier|vendor|voucher|warranty|guarantee', 'customer|customers|store|stores|shop|shopping|sale|sales|discount|discounts|purchase|purchases|retail|product|products|merchandise|consumer'],
  ['office', 'Văn phòng & hành chính', 'agenda|archive|attach|auditorium|branch|compile|confidential|convene|courier|deadline|department|director|documentation|draft|envelope|fill out|headquarters|in writing|notify|postpone|receptionist|reminder|shredder|submit|inquiry|be in charge of|put on hold', 'office|offices|meeting|meetings|conference|conferences|document|documents|report|reports|memo|memos|secretary|administration'],
  ['property', 'Nhà cửa & xây dựng', 'adjacent|architect|blueprint|construction|demolish|erect|excavation|floor|floor plan|foundation|house|landlord|landscape|onsite|ownership|patio|pave|plumber|property|railing|real estate|redecorate|refurbishment|relocate|relocation|remodel|renovation|residence|residential|tenant|utilities|vacant|vacate|ventilation|vicinity', 'building|buildings|construction|apartment|apartments|lease|leasing|rent|rental|tenant|landlord|renovation|property|housing'],
  ['industry', 'Sản xuất & thiết bị', 'appliance|assembly line|breakage|capacity|component|container|durable|equip|equipment|fabric|functional|heavy machinery|install|maintain|maintenance|malfunction|manufacture|material|obsolete|operate|operation|operational|production|productivity|quality|reproduction|sturdy|utilization|warehouse', 'factory|factories|manufacturing|machine|machines|machinery|equipment|repair|repairs|assembly|production|maintenance'],
  ['technology', 'Công nghệ & thông tin', 'electronically|monitor|satellite|technology|update|retrieve|digit', 'computer|computers|software|hardware|website|websites|internet|database|digital|online|network|networks|server|password|printer'],
  ['health', 'Sức khỏe & an toàn', 'alleviate|check-up|contagious|dental|diagnose|hazardous|infection|medical|prescription|protective|safety precaution|strenuous|symptom|treat|vulnerable', 'patient|patients|doctor|doctors|hospital|hospitals|medical|medicine|health|dental|injury|injuries|safety|illness|disease'],
  ['education', 'Giáo dục & nghiên cứu', 'academic|analysis|biologist|certificate|degree|enroll|enrollment|evaluation|finding|fluent|knowledgeable|literacy|novice|research|scholarship|specialist|specialize|specialize in', 'school|schools|student|students|university|college|course|courses|training|education|research|researcher|researchers|classroom|exam'],
  ['culture', 'Sự kiện & văn hóa', 'admission|attend|attire|author|avid|award|celebrate|contemporary|costume|editor|exhibition|flyer|host|manuscript|participant|participate|publication|recreational|registration|renowned|seating|sponsor|statue|venue', 'event|events|concert|concerts|museum|museums|exhibition|festival|ceremony|theater|theatre|performance|audience|art|arts'],
  ['environment', 'Môi trường & thiên nhiên', 'bountiful|emission|environment|extinction|flood|flooding|forest|humidity|indigenous|mow|organic|plant|pollution|reclaim|recycling|sustainable|surround', 'environment|environmental|pollution|recycling|forest|forests|weather|rain|temperature|climate|garden|gardens|nature'],
  ['business', 'Kinh doanh & quy định', 'affiliation|approval|authorize|collaborate|compliance|conform|consensus|consent|corporation|disclose|endorse|ethic|feasibility|founder|govern|incorporate|legal|negotiate|obligation|permission|policy|regulation|restrict|subsidiary|terminate|violate|waive|strategically', 'business|businesses|company|companies|corporate|contract|contracts|agreement|agreements|regulation|regulations|legal|law|laws|strategy|strategies'],
];
const topics = DEFINITIONS.map(([key, name, words, context]) => ({ key, name, words: new Set(words.split('|')), context: new Set(context.split('|')) }));
const general = { key: 'general', name: 'Từ vựng thông dụng' };
function classifyVocabulary(value) {
  const word = value.word.trim().toLowerCase();
  const exact = topics.find(topic => topic.words.has(word));
  if (exact) return { key: exact.key, name: exact.name, basis: 'word' };
  const tokens = new Set((value.example || value.examples?.[0]?.text || '').toLowerCase().match(/[a-z]+/g) || []);
  const ranked = topics.map(topic => ({ topic, score: [...tokens].filter(token => topic.context.has(token)).length })).sort((a,b) => b.score-a.score);
  if (ranked[0].score > 0 && ranked[0].score > ranked[1].score) return { key: ranked[0].topic.key, name: ranked[0].topic.name, basis: 'example' };
  const basic = { ADJECTIVE: ['general-adjectives', 'Tính từ thông dụng'], ADVERB: ['general-adverbs', 'Trạng từ thông dụng'], VERB: ['general-verbs', 'Động từ thông dụng'], NOUN: ['general-nouns', 'Danh từ thông dụng'] }[value.sourcePos];
  return basic ? { key: basic[0], name: basic[1], basis: 'general' } : { ...general, basis: 'general' };
}
function folderKey(topic) { return `santa-vocabulary-topic-v1:${topic.key}`; }
async function importVocabulary(tx, vocabulary, ownerId) {
  const folders = new Map();
  let created = 0, moved = 0;
  for (const v of vocabulary) {
    const topic = classifyVocabulary(v);
    if (!folders.has(topic.key)) folders.set(topic.key, await tx.flashcardFolder.upsert({ where: { readingKey: folderKey(topic) }, update: { name: topic.name, private: false, description: "Từ vựng theo chủ đề, kèm nghĩa, phiên âm và câu ví dụ từ Santa." }, create: { readingKey: folderKey(topic), userId: ownerId, name: topic.name, private: false, description: 'Từ vựng theo chủ đề, kèm nghĩa, phiên âm và câu ví dụ từ Santa.' } }));
    const folder = folders.get(topic.key);
    const current = await tx.flashcard.findUnique({ where: { readingKey: v.key } });
    if (current) {
      if (current.userId !== null && current.userId !== undefined) throw new Error(`Không di chuyển thẻ cá nhân ${current.id}`);
      if (current.folderId !== folder.id || current.topic !== topic.name) {
        // Only placement changes: preserve card identity, vocabulary, notes and spaced-repetition history.
        await tx.flashcard.update({ where: { id: current.id }, data: { folderId: folder.id, topic: topic.name } }); moved++;
      }
      continue;
    }
    const { key, sourcePos: _sourcePos, ...fields } = v;
    await tx.flashcard.create({ data: { ...fields, userId: null, readingKey: key, folderId: folder.id, topic: topic.name } }); created++;
  }
  return { created, moved, folders: [...folders.values()].map(folder => folder.id) };
}
function summarizeVocabulary(vocabulary) {
  const result = new Map();
  for (const value of vocabulary) { const topic = classifyVocabulary(value); const row = result.get(topic.key) || { key: topic.key, name: topic.name, count: 0, word: 0, example: 0, general: 0 }; row.count++; row[topic.basis]++; result.set(topic.key, row); }
  return [...result.values()].sort((a,b) => b.count-a.count);
}
module.exports = { classifyVocabulary, importVocabulary, summarizeVocabulary, folderKey };
