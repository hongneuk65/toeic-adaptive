import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const skillsData = [
  // --- PART 1: Photographs (4 skills) ---
  { code: 'P1_PHOTO_OBJECT', name: 'Mô tả đồ vật / cảnh quan', part: 1, category: 'Listening - Visual' },
  { code: 'P1_PHOTO_ACTION', name: 'Mô tả hành động của người', part: 1, category: 'Listening - Action' },
  { code: 'P1_PHOTO_LOCATION', name: 'Vị trí tương đối & không gian', part: 1, category: 'Listening - Spatial' },
  { code: 'P1_PHOTO_PASSIVE', name: 'Câu bị động mô tả trạng thái đồ vật', part: 1, category: 'Listening - Grammar' },

  // --- PART 2: Question-Response (6 skills) ---
  { code: 'P2_WH_QUESTIONS', name: 'Câu hỏi WH- (Who, Where, When, What, Why, How)', part: 2, category: 'Listening - Information' },
  { code: 'P2_YES_NO_QUESTIONS', name: 'Câu hỏi Yes/No & Trợ động từ', part: 2, category: 'Listening - Verification' },
  { code: 'P2_TAG_QUESTIONS', name: 'Câu hỏi đuôi (Tag Questions)', part: 2, category: 'Listening - Verification' },
  { code: 'P2_CHOICE_QUESTIONS', name: 'Câu hỏi lựa chọn (Or)', part: 2, category: 'Listening - Decision' },
  { code: 'P2_STATEMENT_RESPONSE', name: 'Hồi đáp câu trần thuật (Statements)', part: 2, category: 'Listening - Discourse' },
  { code: 'P2_INDIRECT_RESPONSE', name: 'Phản hồi gián tiếp / ngữ cảnh bất ngờ', part: 2, category: 'Listening - Pragmatics' },

  // --- PART 3: Short Conversations (6 skills) ---
  { code: 'P3_MAIN_TOPIC', name: 'Chủ đề / Mục đích cuộc đối thoại', part: 3, category: 'Listening - Gist' },
  { code: 'P3_DETAIL_LOOKUP', name: 'Chi tiết cụ thể (Thời gian, địa điểm, số lượng)', part: 3, category: 'Listening - Detail' },
  { code: 'P3_ACTION_NEXT', name: 'Hành động kế tiếp của người nói', part: 3, category: 'Listening - Inference' },
  { code: 'P3_SPEAKER_IDENTITY', name: 'Danh tính / Nghề nghiệp / Mối quan hệ người nói', part: 3, category: 'Listening - Inference' },
  { code: 'P3_IMPLIED_MEANING', name: 'Ngụ ý câu nói trong ngữ cảnh (Quotation)', part: 3, category: 'Listening - Pragmatics' },
  { code: 'P3_GRAPH_LOOKUP', name: 'Kết hợp hội thoại với bảng biểu/đồ thị', part: 3, category: 'Listening - Graphic Integration' },

  // --- PART 4: Short Talks (5 skills) ---
  { code: 'P4_PURPOSE_TALK', name: 'Mục đích bài thông báo / bài nói', part: 4, category: 'Listening - Gist' },
  { code: 'P4_SPECIFIC_FACT', name: 'Tìm kiếm thông tin thực tế chi tiết', part: 4, category: 'Listening - Detail' },
  { code: 'P4_REQUEST_SUGGEST', name: 'Lời yêu cầu, đề nghị hoặc cảnh báo', part: 4, category: 'Listening - Action' },
  { code: 'P4_IMPLIED_MEANING', name: 'Ý định ẩn giấu của người thuyết trình', part: 4, category: 'Listening - Pragmatics' },
  { code: 'P4_GRAPH_LOOKUP', name: 'Đối chiếu bài nói với sơ đồ / biểu mẫu', part: 4, category: 'Listening - Graphic Integration' },

  // --- PART 5: Incomplete Sentences (8 skills) ---
  { code: 'P5_PARTS_OF_SPEECH', name: 'Từ loại (Danh, Động, Tính, Trạng)', part: 5, category: 'Reading - Grammar' },
  { code: 'P5_VERB_TENSES_VOICE', name: 'Thì động từ & Thể chủ/bị động', part: 5, category: 'Reading - Grammar' },
  { code: 'P5_SUBJECT_VERB_AGREE', name: 'Sự hòa hợp chủ vị & Đại từ', part: 5, category: 'Reading - Grammar' },
  { code: 'P5_CONNECTORS_CONJ', name: 'Liên từ & Giới từ chỉ quan hệ', part: 5, category: 'Reading - Grammar' },
  { code: 'P5_RELATIVE_CLAUSES', name: 'Mệnh đề quan hệ & Rút gọn mệnh đề', part: 5, category: 'Reading - Grammar' },
  { code: 'P5_SUBJUNCTIVE_MODAL', name: 'Câu điều kiện & Động từ khuyết thiếu', part: 5, category: 'Reading - Grammar' },
  { code: 'P5_COLLOCATIONS', name: 'Cụm từ cố định & Đi kèm quen thuộc', part: 5, category: 'Reading - Vocabulary' },
  { code: 'P5_CONTEXT_VOCAB', name: 'Từ vựng theo ngữ cảnh kinh doanh/văn phòng', part: 5, category: 'Reading - Vocabulary' },

  // --- PART 6: Text Completion (4 skills) ---
  { code: 'P6_GRAMMAR_IN_CONTEXT', name: 'Ngữ pháp trong văn bản liền mạch', part: 6, category: 'Reading - Grammar' },
  { code: 'P6_VOCAB_IN_CONTEXT', name: 'Từ vựng phù hợp đoạn văn', part: 6, category: 'Reading - Vocabulary' },
  { code: 'P6_SENTENCE_INSERTION', name: 'Điền câu hoàn chỉnh vào vị trí thích hợp', part: 6, category: 'Reading - Cohesion' },
  { code: 'P6_TRANSITION_WORDS', name: 'Từ nối logic chuyển câu / chuyển đoạn', part: 6, category: 'Reading - Discourse' },

  // --- PART 7A: Single Passages (4 skills) ---
  { code: 'P7A_MAIN_PURPOSE', name: 'Mục đích chính của đoạn đơn', part: 7, category: 'Reading - Single Gist' },
  { code: 'P7A_FACT_NEGATIVE_FACT', name: 'Tìm thông tin chi tiết (Dạng True/Not True)', part: 7, category: 'Reading - Single Detail' },
  { code: 'P7A_INFERENCE_DETAIL', name: 'Suy luận logic từ dữ kiện đoạn đơn', part: 7, category: 'Reading - Single Inference' },
  { code: 'P7A_VOCAB_SYNONYM', name: 'Từ đồng nghĩa trong ngữ cảnh đoạn đơn', part: 7, category: 'Reading - Single Vocabulary' },

  // --- PART 7B: Multiple Passages (3 skills) ---
  { code: 'P7B_CROSS_INFO_SYNTHESIS', name: 'Tổng hợp & Đối chiếu chéo giữa 2-3 văn bản', part: 7, category: 'Reading - Multi Cross' },
  { code: 'P7B_MULTI_INFERENCE', name: 'Suy luận phức hợp từ nhiều nguồn tài liệu', part: 7, category: 'Reading - Multi Inference' },
  { code: 'P7B_CHAIN_CORRESPONDENCE', name: 'Phân tích chuỗi trao đổi (Email, Chat, Hóa đơn)', part: 7, category: 'Reading - Multi Chain' },
];

async function main() {
  console.log('--- Bắt đầu seed 40 skill ETS ---');
  for (const item of skillsData) {
    await prisma.skill.upsert({
      where: { code: item.code },
      update: { name: item.name, part: item.part, category: item.category },
      create: item,
    });
  }
  console.log(`✔ Đã seed thành công ${skillsData.length} skill vào cơ sở dữ liệu.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });