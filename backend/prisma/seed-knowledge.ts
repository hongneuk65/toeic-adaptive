import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface KnowledgeItem {
  part: number;
  skillCode: string;
  category: 'Grammar' | 'Vocabulary' | 'Strategy' | 'Trap';
  title: string;
  content: string;
  keywords: string[];
}

interface LessonItem {
  part: number;
  skillCode: string;
  title: string;
  content: string;
}

const lessonsData: LessonItem[] = [
  // --- PART 1 ---
  {
    part: 1,
    skillCode: 'P1_PHOTO_OBJECT',
    title: 'Chiến thuật miêu tả đồ vật và bẫy thì Being V-ed trong Part 1',
    content: `## 1. Bản chất dạng bài miêu tả đồ vật (Part 1)
Trong Part 1, khi tranh không có người hoặc chỉ tập trung vào đồ vật:
- Bẫy kinh điển: Cấu trúc "is/are being + V3/ed" chỉ hành động đang được người tác động lên vật.
  Ví dụ: "The car is being repaired" -> Bắt buộc phải có người thợ đang sửa xe trong hình. Nếu xe chỉ đậu ở bãi thì câu này là SAI!
- Ngoại lệ trạng thái: "The goods are being displayed on the shelf" (Hàng hóa đang được trưng bày trên kệ).

## 2. Các giới từ chỉ vị trí thường gặp
- In the background / In the foreground (Hậu cảnh / Tiền cảnh).
- Propped against the wall (Dựng / tựa vào tường).
- Suspended from the ceiling (Treo lơ lửng từ trần).
- Stacked in piles (Xếp chồng lên nhau).
- Lined up along the curb (Xếp thành hàng dọc lề đường).`,
  },
  {
    part: 1,
    skillCode: 'P1_PHOTO_ACTION',
    title: 'Phân biệt hành động (Action) và trạng thái (State) trong Part 1',
    content: `## 1. Cặp động từ Hành động vs Trạng thái
- Wearing vs Putting on:
  + Wearing: Đang mặc sẵn quần áo/kính/nón trên người (Trạng thái).
  + Putting on: Đang đưa tay xỏ áo, đội nón (Hành động đang diễn ra).
- Riding vs Boarding:
  + Riding: Đang ngồi lái hoặc ngồi trên xe.
  + Boarding: Đang bước chân lên cửa xe/máy bay.

## 2. Quy tắc phản xạ khi nghe
1. Quan sát tay, chân và tư thế của người trong ảnh.
2. Nếu đối tượng chỉ đứng yên mà câu dùng động từ chạy/nhảy -> Loại ngay.`,
  },
  // --- PART 2 ---
  {
    part: 2,
    skillCode: 'P2_WH_QUESTIONS',
    title: 'Quy tắc vàng xử lý câu hỏi Wh-Questions và bẫy lặp từ Part 2',
    content: `## 1. Wh-Questions KHÔNG BAO GIỜ trả lời bằng Yes / No
- Các câu hỏi Who, Where, When, What, Why, How tuyệt đối KHÔNG trả lời bằng "Yes", "No", "Sure", "Certainly".
- Thấy phương án có Yes/No -> Loại ngay trong 0.5 giây!

## 2. Bẫy âm tương tự và bẫy lặp từ
- ETS thường gài bẫy bằng cách lặp lại từ hoặc từ phát âm na ná:
  * Ví dụ: Câu hỏi có "coffee", phương án sai có "copy".
  * Câu hỏi có "report", phương án sai lặp lại "Yes, the report is long".
- Hơn 85% phương án lặp từ trong Part 2 là BẪY SAI!`,
  },
  {
    part: 2,
    skillCode: 'P2_INDIRECT_RESPONSE',
    title: 'Bí quyết bắt trọn câu trả lời né tránh và phản hồi gián tiếp Part 2',
    content: `## 1. Câu trả lời gián tiếp (Indirect Answers)
Chiếm 40% câu hỏi Part 2 trong đề thi hiện đại:
- "I don't know" qua các biến thể:
  + "It hasn't been announced yet."
  + "Mary would probably know that."
  + "I haven't checked my inbox today."
## 2. Phản hồi bằng câu hỏi ngược lại
- Q: "Are you attending the seminar this afternoon?"
- A: "Has the venue been decided?"`,
  },
  // --- PART 3 & 4 ---
  {
    part: 3,
    skillCode: 'P3_MAIN_TOPIC',
    title: 'Kỹ thuật Skimming câu hỏi trước và xác định chủ đề cuộc thoại Part 3',
    content: `## 1. Quy tắc 30 giây vàng giữa các bài thoại
Dùng 30 giây đọc lướt 3 câu hỏi trước khi nghe audio:
- Câu 1: Chủ đề, danh tính người nói hay địa điểm?
- Câu 2: Thông tin chi tiết (Thời gian, số tiền, lý do)?
- Câu 3: Hành động kế tiếp (Next step)?
## 2. Nhận diện chủ đề
Thông tin chủ đề nằm trong 1-2 câu đầu tiên:
* "I'm calling about the invoice..." -> Billing / Payment.
* "The copier isn't working..." -> Equipment malfunction.`,
  },
  {
    part: 4,
    skillCode: 'P4_GRAPH_LOOKUP',
    title: 'Chiến thuật giải câu hỏi biểu đồ / lịch trình trong Part 4',
    content: `## 1. Nguyên tắc "Nhìn một đằng, nghe một nẻo"
Khi câu hỏi có "Look at the graphic":
- Audio KHÔNG BAO GIỜ đọc thẳng từ đáp án trong bảng!
- Nếu đáp án là Cột A (tên người), audio sẽ nói về Cột B (thời gian hoặc đề tài).
- Nhiệm vụ: Nghe thông tin Cột B, nhìn thật nhanh sang Cột A để tick chọn.`,
  },
];

const lessonsPart567: LessonItem[] = [
  // --- PART 5 ---
  {
    part: 5,
    skillCode: 'P5_PARTS_OF_SPEECH',
    title: 'Ma trận định vị Từ loại (Danh - Động - Tính - Trạng) trong Part 5',
    content: `## 1. Dấu hiệu câu hỏi Từ loại
4 đáp án chung một gốc từ nhưng khác hậu tố (produce, production, productive, productively).
## 2. Vị trí vàng của Trạng từ (Adverb)
- Giữa Trợ động từ và Động từ chính: have + ADV + V3/ed hoặc be + ADV + V-ing/ed.
- Trước Tính từ bổ nghĩa: an extremely important meeting.
- Đứng đầu câu trước dấu phẩy hoặc cuối câu bổ nghĩa cho động từ.
## 3. Vị trí Tính từ và Danh từ
- a/an/the + ADJ + NOUN.
- Sau linking verbs (remain, become, seem, look) là Tính từ.`,
  },
  {
    part: 5,
    skillCode: 'P5_VERB_TENSES_VOICE',
    title: 'Chinh phục Thì động từ và Thể Bị động trong TOEIC Part 5',
    content: `## 1. Quy trình 3 bước xử lý câu Động từ
1. Bước 1: Chia thì hay Rút gọn? Kiểm tra câu đã có Main Verb chưa.
2. Bước 2: Chủ ngữ số ít hay số nhiều?
3. Bước 3: Thể Chủ động hay Bị động (Có tân ngữ theo sau hay không).
## 2. Dấu hiệu thì
- Hiện tại hoàn thành: since, for, recently, already, over the past 3 years.
- Tương lai: next week, upcoming, tomorrow.
- Quá khứ đơn: yesterday, last year, ago.`,
  },
  {
    part: 5,
    skillCode: 'P5_CONNECTORS_CONJ',
    title: 'Phân biệt Liên từ (Conjunction) và Giới từ (Preposition)',
    content: `## 1. Bảng quy đổi kinh điển
- Mặc dù: Although, Even though (+ S + V) vs Despite, In spite of (+ Cụm danh từ / V-ing).
- Bởi vì: Because, Since, As (+ S + V) vs Because of, Due to (+ Cụm danh từ / V-ing).
- Trong khi: While (+ S + V) vs During (+ Danh từ thời gian).
## 2. Bí quyết 5 giây
Nhìn sau khoảng trống:
- Có "S + V" -> Chọn LIÊN TỪ.
- Chỉ có "Cụm danh từ / V-ing" -> Chọn GIỚI TỪ.`,
  },
  {
    part: 5,
    skillCode: 'P5_RELATIVE_CLAUSES',
    title: 'Mệnh đề quan hệ và Rút gọn mệnh đề quan hệ đỉnh cao Part 5',
    content: `## 1. Rút gọn Mệnh đề quan hệ
- Dạng chủ động -> Rút về V-ing: The engineer who designed the bridge -> The engineer designing the bridge.
- Dạng bị động -> Rút về V3/ed: The report that was submitted yesterday -> The report submitted yesterday.`,
  },
  // --- PART 6 & 7 ---
  {
    part: 6,
    skillCode: 'P6_SENTENCE_INSERTION',
    title: 'Bí quyết chọn câu chèn vào đoạn văn Part 6',
    content: `## 1. Bắt cầu liên kết logic (Cohesion Clues)
- Tìm đại từ chỉ định: This, That, These, Those + Noun.
- Tìm từ nối: However, Therefore, In addition, Consequently.
- Thử từng câu và đối chiếu logic liền trước - liền sau.`,
  },
  {
    part: 7,
    skillCode: 'P7A_FACT_NEGATIVE_FACT',
    title: 'Chiến thuật xử lý câu hỏi Not/True và bẫy suy diễn Part 7',
    content: `## 1. Scanning theo từ khóa độc nhất
1. Đọc lướt 4 lựa chọn trước.
2. Gạch chân từ khóa khó bị paraphrase: Tên riêng, số liệu, ngày tháng.
3. Quét mắt định vị trong văn bản để đối chiếu từng đáp án.
## 2. Bẫy suy diễn ngoài đời
Đáp án đúng bắt buộc phải có chứng cứ trong bài! Không tự suy diễn từ kiến thức bên ngoài.`,
  },
  {
    part: 7,
    skillCode: 'P7B_CROSS_INFO_SYNTHESIS',
    title: 'Tuyệt kỹ giải quyết đoạn văn kép và ba (Double & Triple Passages)',
    content: `## 1. Câu hỏi liên kết chéo (Cross-reference)
2-3 câu hỏi yêu cầu kết hợp thông tin giữa 2 văn bản khác nhau.
## 2. Tìm điểm chạm chung
Điểm chạm thường là Mã đơn hàng, Ngày tháng, hoặc Tên nhân sự làm cầu nối giữa email và bảng biểu.`,
  },
];
const chunksPart1: KnowledgeItem[] = [
  {
    part: 1,
    skillCode: 'P1_PHOTO_OBJECT',
    category: 'Trap',
    title: 'Bẫy thì hiện tại tiếp diễn bị động (being + V3) khi không có người',
    content: 'Trong Part 1, nếu bức tranh không có bóng dáng con người nhưng câu miêu tả dùng cấu trúc "is/are being + V3/ed" (ví dụ: The car is being washed), thì đây là phương án BẪY SAI. Cấu trúc being + V3 chỉ hành động đang diễn ra bởi người tác động.',
    keywords: ['being', 'passive', 'vật', 'không có người', 'trạng thái', 'part 1'],
  },
  {
    part: 1,
    skillCode: 'P1_PHOTO_ACTION',
    category: 'Strategy',
    title: 'Phân biệt hành động Putting on và trạng thái Wearing trong tranh Part 1',
    content: 'Từ "wearing" chỉ trạng thái nhân vật đã mặc sẵn trang phục trên người. Từ "putting on" chỉ hành động nhân vật đang dùng tay xỏ áo hoặc đội nón. Nếu tranh vẽ người đang đeo kính sẵn thì chọn "wearing glasses", chọn "putting on glasses" là sai.',
    keywords: ['wearing', 'putting on', 'hành động', 'trạng thái', 'quần áo', 'kính'],
  },
  {
    part: 2,
    skillCode: 'P2_WH_QUESTIONS',
    category: 'Trap',
    title: 'Bẫy Yes/No đối với câu hỏi Wh- trong Part 2',
    content: 'Tất cả câu hỏi Wh- (Who, What, Where, When, Why, How) đều nhằm mục đích lấy thông tin cụ thể, tuyệt đối KHÔNG thể trả lời bằng Yes hoặc No. Nếu nghe thấy phương án bắt đầu bằng Yes/No/Sure/Certainly thì loại ngay.',
    keywords: ['wh-question', 'yes', 'no', 'loại suy', 'part 2', 'who', 'where', 'when', 'why'],
  },
  {
    part: 2,
    skillCode: 'P2_WH_QUESTIONS',
    category: 'Trap',
    title: 'Bẫy lặp từ và âm tương tự (Same word / Similar sound) Part 2',
    content: 'ETS rất thích gài bẫy lặp lại từ hoặc âm tương tự trong câu hỏi ở một phương án sai. Ví dụ trong câu hỏi có "coffee" thì đáp án sai có "copy", câu hỏi có "project" thì đáp án sai lặp lại "Yes, the project is huge". Trên 85% trường hợp lặp từ là bẫy sai.',
    keywords: ['lặp từ', 'similar sound', 'same word', 'bẫy âm', 'distractor'],
  },
  {
    part: 2,
    skillCode: 'P2_INDIRECT_RESPONSE',
    category: 'Strategy',
    title: 'Nhận diện câu trả lời gián tiếp hoặc không biết (Indirect response)',
    content: 'Câu trả lời gián tiếp né tránh thường là đáp án đúng trong các câu khó của Part 2. Dấu hiệu: "I have no idea", "It has not been decided yet", "You should ask Mr. Kim", hoặc một câu hỏi ngược để xin thêm thông tin.',
    keywords: ['indirect', 'gián tiếp', 'chưa quyết định', 'hỏi người khác', 'né tránh'],
  },
  {
    part: 3,
    skillCode: 'P3_MAIN_TOPIC',
    category: 'Strategy',
    title: 'Chiến thuật đọc lướt 3 câu hỏi trước khi nghe hội thoại Part 3',
    content: 'Dành 30-40 giây đọc trước 3 câu hỏi và gạch chân từ khóa hỏi về: Ai nói (Who), Chủ đề (Main topic), Chi tiết (Where/When/Price), Hành động tiếp theo (Next action). Điều này định hướng vùng thông tin cần đón đầu trong audio.',
    keywords: ['skimming', 'đọc trước câu hỏi', 'main topic', 'chi tiết', 'part 3'],
  },
  {
    part: 4,
    skillCode: 'P4_GRAPH_LOOKUP',
    category: 'Strategy',
    title: 'Quy tắc đối chiếu chéo biểu đồ trong Part 4 (Graphic questions)',
    content: 'Khi câu hỏi có "Look at the graphic", audio sẽ không nhắc thẳng đến từ nằm trong đáp án. Audio sẽ nói về thông tin đối xứng ở cột bên cạnh, học viên cần nhanh mắt tra sang cột đáp án để chọn chuẩn xác.',
    keywords: ['graphic', 'biểu đồ', 'lịch trình', 'đối chiếu', 'part 4', 'nhìn bảng'],
  },
];
const chunksPart2: KnowledgeItem[] = [
  {
    part: 5,
    skillCode: 'P5_PARTS_OF_SPEECH',
    category: 'Grammar',
    title: 'Quy tắc vị trí của Trạng từ (Adverb) trong câu Part 5',
    content: 'Trạng từ (đuôi -ly) bổ nghĩa cho Động từ, Tính từ hoặc Trạng từ khác. Vị trí thường gặp nhất trong TOEIC: 1. Đứng giữa Trợ động từ và Động từ chính (have/has/be + ADV + V-ed/V-ing); 2. Đứng trước Tính từ để bổ nghĩa (ADV + ADJ + NOUN); 3. Đứng cuối câu sau tân ngữ hoàn chỉnh để bổ nghĩa cho động từ.',
    keywords: ['trạng từ', 'adverb', 'ly', 'vị trí', 'bổ nghĩa tính từ', 'trợ động từ'],
  },
  {
    part: 5,
    skillCode: 'P5_PARTS_OF_SPEECH',
    category: 'Grammar',
    title: 'Quy tắc xác định vị trí của Danh từ và Tính từ trong cụm',
    content: 'Cấu trúc cụm danh từ chuẩn: "a/an/the + ADV + ADJ + NOUN". Nếu trước khoảng trống là mạo từ (the/a/an) hoặc tính từ sở hữu (their/our/his) và sau khoảng trống không có danh từ nào, chỗ trống bắt buộc phải là DANH TỪ (Noun).',
    keywords: ['danh từ', 'tính từ', 'noun', 'adjective', 'mạo từ', 'cụm danh từ'],
  },
  {
    part: 5,
    skillCode: 'P5_VERB_TENSES_VOICE',
    category: 'Grammar',
    title: 'Dấu hiệu nhận biết thì Hiện tại Hoàn thành (Present Perfect)',
    content: 'Thì hiện tại hoàn thành (have/has + V3/ed) xuất hiện khi câu có các dấu hiệu thời gian: "since + mốc thời gian", "for + khoảng thời gian", "recently", "lately", "already", "yet", hoặc các cụm "over/in/during the past/last + thời gian".',
    keywords: ['hiện tại hoàn thành', 'since', 'for', 'recently', 'already', 'over the past', 'have has v3'],
  },
  {
    part: 5,
    skillCode: 'P5_CONNECTORS_CONJ',
    category: 'Grammar',
    title: 'Phân biệt Liên từ phụ thuộc (Although/Because) và Giới từ (Despite/Due to)',
    content: 'Liên từ (Although, Even though, Because, Since, While) bắt buộc phải theo sau bởi MỆNH ĐỀ có S + V. Giới từ (Despite, In spite of, Because of, Due to, During) chỉ được theo sau bởi CỤM DANH TỪ hoặc V-ing.',
    keywords: ['liên từ', 'giới từ', 'although', 'despite', 'because', 'due to', 'mệnh đề', 'noun phrase'],
  },
  {
    part: 5,
    skillCode: 'P5_RELATIVE_CLAUSES',
    category: 'Grammar',
    title: 'Rút gọn Mệnh đề quan hệ thành V-ing (Chủ động) hoặc V-ed (Bị động)',
    content: 'Rút gọn mệnh đề quan hệ: Chủ động rút về V-ing (The man teaching...). Bị động rút về V-ed/V3 (Products manufactured...).',
    keywords: ['mệnh đề quan hệ', 'rút gọn', 'v-ing', 'v-ed', 'chủ động', 'bị động'],
  },
  {
    part: 6,
    skillCode: 'P6_SENTENCE_INSERTION',
    category: 'Strategy',
    title: 'Tìm manh mối liên kết (Pronouns & Connectors) khi chọn câu điền Part 6',
    content: 'Khi điền nguyên câu vào đoạn văn Part 6, tìm đại từ chỉ định This/That/These hoặc từ nối Consequently, However để bắt cầu logic giữa câu trước và sau.',
    keywords: ['sentence insertion', 'điền câu', 'đại từ chỉ định', 'this that these', 'mạch lạc', 'part 6'],
  },
  {
    part: 7,
    skillCode: 'P7A_FACT_NEGATIVE_FACT',
    category: 'Strategy',
    title: 'Kỹ thuật định vị từ khóa cho câu hỏi True / Not True trong Part 7',
    content: 'Với câu hỏi NOT/TRUE, đọc lướt 4 lựa chọn trước, chọn tên riêng, số liệu, ngày tháng làm từ khóa neo rồi quét mắt nhanh trên bài để kiểm tra từng câu.',
    keywords: ['not mentioned', 'true', 'scanning', 'part 7', 'từ khóa', 'đoạn đơn'],
  },
  {
    part: 7,
    skillCode: 'P7B_CROSS_INFO_SYNTHESIS',
    category: 'Strategy',
    title: 'Tìm điểm chạm chung (Common anchor) trong đoạn kép và ba Part 7',
    content: 'Trong bài đọc kép/ba, câu hỏi suy luận chéo luôn có một "điểm chạm": Mã số đơn hàng, ngày hẹn, tên người hoặc tên sản phẩm giữa hai văn bản.',
    keywords: ['đoạn kép', 'đoạn ba', 'cross-reference', 'suy luận chéo', 'triple passage', 'part 7'],
  },
];

async function main() {
  console.log('--- Bắt đầu seed Kho Tri Thức RAG (Knowledge Chunks & Theory Lessons) ---');

  const allLessons = [...lessonsData, ...lessonsPart567];

  for (const item of allLessons) {
    const skill = await prisma.skill.findFirst({
      where: { code: item.skillCode },
    });

    if (!skill) {
      console.warn(`Không tìm thấy skill với code: ${item.skillCode}`);
      continue;
    }

    const existing = await prisma.theoryLesson.findFirst({
      where: { title: item.title, part: item.part },
    });

    if (!existing) {
      await prisma.theoryLesson.create({
        data: {
          title: item.title,
          content: item.content,
          part: item.part,
          skillId: skill.id,
        },
      });
      console.log(`+ Tạo bài học: "${item.title}" (Part ${item.part})`);
    } else {
      await prisma.theoryLesson.update({
        where: { id: existing.id },
        data: {
          content: item.content,
          skillId: skill.id,
        },
      });
      console.log(`* Cập nhật bài học: "${item.title}"`);
    }
  }

  const allChunks = [...chunksPart1, ...chunksPart2];

  for (const chunk of allChunks) {
    const existing = await prisma.knowledgeChunk.findFirst({
      where: { title: chunk.title, part: chunk.part },
    });

    if (!existing) {
      await prisma.knowledgeChunk.create({
        data: {
          part: chunk.part,
          skillCode: chunk.skillCode,
          category: chunk.category,
          title: chunk.title,
          content: chunk.content,
          keywords: chunk.keywords,
        },
      });
      console.log(`+ Tạo Knowledge Chunk: [${chunk.category}] ${chunk.title}`);
    } else {
      await prisma.knowledgeChunk.update({
        where: { id: existing.id },
        data: {
          skillCode: chunk.skillCode,
          category: chunk.category,
          content: chunk.content,
          keywords: chunk.keywords,
        },
      });
      console.log(`* Cập nhật Knowledge Chunk: ${chunk.title}`);
    }
  }

  const lessonCount = await prisma.theoryLesson.count();
  const chunkCount = await prisma.knowledgeChunk.count();
  console.log(`🎉 Kho tri thức RAG sẵn sàng! Tổng: ${lessonCount} bài học lý thuyết, ${chunkCount} knowledge chunks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


