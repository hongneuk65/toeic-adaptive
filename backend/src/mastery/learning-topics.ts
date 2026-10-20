/** Presentation curriculum v1. Does not merge or retrain underlying DAS3H tags. */
export const LEARNING_TOPICS = [
  { id: 'photo-description', title: 'Mô tả người & cảnh vật', description: 'Hành động, trạng thái và vị trí trong tranh.' },
  { id: 'question-response', title: 'Hỏi đáp & phản xạ nghe', description: 'Nhận diện câu hỏi, lời đề nghị và phản hồi phù hợp.' },
  { id: 'listening-main-detail', title: 'Nghe ý chính & thông tin', description: 'Chủ đề, mục đích, người nói và chi tiết trong hội thoại, bài nói.' },
  { id: 'listening-inference', title: 'Nghe hiểu ngụ ý & hành động', description: 'Nắm ngữ cảnh, ý định và việc cần làm tiếp theo.' },
  { id: 'listening-visual', title: 'Nghe kết hợp bảng biểu', description: 'Đối chiếu thông tin nghe với hình ảnh và biểu đồ.' },
  { id: 'word-forms', title: 'Từ loại & cấu trúc câu', description: 'Danh, động, tính, trạng từ; đại từ và hòa hợp chủ vị.' },
  { id: 'verbs', title: 'Động từ, thì & thể', description: 'Thì, chủ động, bị động, điều kiện và động từ khuyết thiếu.' },
  { id: 'connections', title: 'Liên kết câu & đoạn văn', description: 'Giới từ, liên từ, mệnh đề quan hệ và điền câu.' },
  { id: 'context-vocabulary', title: 'Từ vựng & cụm từ trong ngữ cảnh', description: 'Collocation, lựa chọn từ và diễn đạt tương đương.' },
  { id: 'reading-information', title: 'Đọc tìm ý chính & chi tiết', description: 'Đọc email, thông báo, quảng cáo và các văn bản công việc.' },
  { id: 'reading-synthesis', title: 'Đọc suy luận & nhiều văn bản', description: 'Kết nối dữ kiện, suy luận và đối chiếu các nguồn thông tin.' },
  { id: 'reading-context', title: 'Hoàn thiện văn bản', description: 'Vận dụng ngữ pháp, từ vựng và ngữ cảnh trong Part 6.' },
] as const;
type TopicId = typeof LEARNING_TOPICS[number]['id'];
const MEMBERS: Record<string, TopicId> = {
  P1_PHOTO_OBJECT: 'photo-description', P1_PHOTO_ACTION: 'photo-description', P1_PHOTO_LOCATION: 'photo-description', P1_PHOTO_PASSIVE: 'photo-description',
  P2_WH_QUESTIONS: 'question-response', P2_YES_NO_QUESTIONS: 'question-response', P2_TAG_QUESTIONS: 'question-response', P2_CHOICE_QUESTIONS: 'question-response', P2_STATEMENT_RESPONSE: 'question-response', P2_INDIRECT_RESPONSE: 'question-response',
  P3_MAIN_TOPIC: 'listening-main-detail', P3_DETAIL_LOOKUP: 'listening-main-detail', P3_SPEAKER_IDENTITY: 'listening-main-detail', P4_PURPOSE_TALK: 'listening-main-detail', P4_SPECIFIC_FACT: 'listening-main-detail',
  P3_ACTION_NEXT: 'listening-inference', P3_IMPLIED_MEANING: 'listening-inference', P4_REQUEST_SUGGEST: 'listening-inference', P4_IMPLIED_MEANING: 'listening-inference',
  P3_GRAPH_LOOKUP: 'listening-visual', P4_GRAPH_LOOKUP: 'listening-visual',
  P5_PARTS_OF_SPEECH: 'word-forms', P5_SUBJECT_VERB_AGREE: 'word-forms',
  P5_VERB_TENSES_VOICE: 'verbs', P5_SUBJUNCTIVE_MODAL: 'verbs',
  P5_CONNECTORS_CONJ: 'connections', P5_RELATIVE_CLAUSES: 'connections', P6_SENTENCE_INSERTION: 'connections', P6_TRANSITION_WORDS: 'connections',
  P5_COLLOCATIONS: 'context-vocabulary', P5_CONTEXT_VOCAB: 'context-vocabulary', P6_VOCAB_IN_CONTEXT: 'context-vocabulary', P7A_VOCAB_SYNONYM: 'context-vocabulary',
  P7A_MAIN_PURPOSE: 'reading-information', P7A_FACT_NEGATIVE_FACT: 'reading-information',
  P7A_INFERENCE_DETAIL: 'reading-synthesis', P7B_CROSS_INFO_SYNTHESIS: 'reading-synthesis', P7B_MULTI_INFERENCE: 'reading-synthesis', P7B_CHAIN_CORRESPONDENCE: 'reading-synthesis',
  P6_GRAMMAR_IN_CONTEXT: 'reading-context',
};
export function topicForSkill(code: string) {
  const id = MEMBERS[code];
  return LEARNING_TOPICS.find(topic => topic.id === id) ?? null;
}
export function topicForLesson(lesson: { title: string; part: number; skill?: { code: string } | null }) {
  // Santa's broad legacy skill assignments cannot distinguish many lecture topics.
  const title = lesson.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  let id: TopicId | undefined;
  if (lesson.part >= 5) {
    if (/tu vung|collocation|dong nghia/.test(title)) id = 'context-vocabulary';
    else if (/lien tu|gioi tu|menh de|lien ket|tu noi|dien cau/.test(title)) id = 'connections';
    else if (/thi\b|thi\/the|chu dong|bi dong|khuyet thieu|dieu kien/.test(title)) id = 'verbs';
    else if (/tu loai|danh tu|tinh tu|trang tu|dai tu|hoa hop|han dinh|danh dong tu/.test(title)) id = 'word-forms';
    else if (lesson.part === 7 && /van ban kep|3 van ban|nhieu van ban|suy luan/.test(title)) id = 'reading-synthesis';
  }
  return LEARNING_TOPICS.find(topic => topic.id === id) ?? topicForSkill(lesson.skill?.code ?? '') ?? { id: 'other', title: 'Bài học khác', description: 'Bài học chưa có nhóm chủ đề phù hợp.' };
}

interface ProfileSkill { skillId: number; skillCode: string; part: number; masteryScore: number; practiceCount: number; }
interface TopicLesson { id: number; title: string; part: number; skillId: number; skill?: { code: string } | null; }
export function groupLearningTopics(skills: ProfileSkill[], lessons: TopicLesson[]) {
  const groups = LEARNING_TOPICS.map(topic => {
    const members = skills.filter(skill => topicForSkill(skill.skillCode)?.id === topic.id);
    const observed = members.filter(skill => skill.practiceCount > 0);
    // Equal-weight skill estimates avoid repeated practice drowning out other skills.
    const estimatedSuccess = observed.length ? observed.reduce((sum, skill) => sum + skill.masteryScore, 0) / observed.length : null;
    const enoughEvidence = observed.length / Math.max(1, members.length) >= .5 && observed.reduce((n, skill) => n + skill.practiceCount, 0) >= 10;
    const priority: 'focus' | 'diagnostic' | 'maintain' = estimatedSuccess !== null && estimatedSuccess < .65 ? 'focus' : !enoughEvidence ? 'diagnostic' : 'maintain';
    const chosen = priority === 'diagnostic'
      ? [...members].sort((a, b) => a.practiceCount - b.practiceCount || a.skillId - b.skillId)[0]
      : [...observed].sort((a, b) => a.masteryScore - b.masteryScore || a.skillId - b.skillId)[0];
    const matchingLessons = lessons.filter(lesson => topicForLesson(lesson).id === topic.id);
    const lesson = matchingLessons.find(item => item.skillId === chosen?.skillId) ?? matchingLessons[0];
    return { ...topic, parts: [...new Set(members.map(skill => skill.part))].sort(), skillIds: members.map(skill => skill.skillId),
      observedSkillCount: observed.length, totalSkillCount: members.length, estimatedSuccess,
      evidenceStatus: !observed.length ? 'unassessed' : enoughEvidence ? 'practiced' : 'limited', priority,
      recommendedSkillId: chosen?.skillId ?? null, lesson: lesson ? { id: lesson.id, title: lesson.title, part: lesson.part } : null };
  }).filter(group => group.totalSkillCount > 0);
  const rank = { focus: 0, diagnostic: 1, maintain: 2 };
  return groups.sort((a, b) => rank[a.priority] - rank[b.priority] || (a.estimatedSuccess ?? 1) - (b.estimatedSuccess ?? 1));
}
