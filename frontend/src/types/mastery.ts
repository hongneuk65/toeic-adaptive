export interface SkillMasteryItem {
  skillId: number;
  skillCode: string;
  skillName: string;
  category?: string;
  part: number;
  masteryScore: number;
  practiceCount: number;
  lastPracticed: string | null;
}

export interface PartMasteryItem {
  part: number;
  partName: string;
  averageMastery: number;
  totalSkills: number;
}

export interface UserMasteryProfile {
  userId: number;
  skills: SkillMasteryItem[];
  partBreakdown: PartMasteryItem[];
  overallMastery: number;
}

export interface AdaptiveQuestion {
  id: number;
  part: number;
  content: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
  passage?: string | null;
}

export interface AdaptiveQuestionResponse {
  selectedQuestion: AdaptiveQuestion;
  predictedProb: number;
  targetProb: number;
  evaluatedCandidatesCount: number;
  isExploration: boolean;
}

export interface AnswerAdaptiveResponse {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string | null;
}

export const PART_META: Record<number, { title: string; section: 'Listening' | 'Reading'; description: string; advice: string }> = {
  1: {
    title: 'Part 1: Mô Tả Tranh (Photographs)',
    section: 'Listening',
    description: 'Nghe 4 phương án miêu tả hành động của người hoặc trạng thái đồ vật.',
    advice: 'Tập trung vào chủ ngữ và động từ chính, tránh bẫy từ đồng âm hoặc thì bị động không có người.',
  },
  2: {
    title: 'Part 2: Hỏi & Đáp (Question-Response)',
    section: 'Listening',
    description: 'Nghe câu hỏi hoặc phát biểu và chọn 1 trong 3 câu trả lời phù hợp nhất.',
    advice: 'Nắm chắc từ để hỏi (Who, When, Where, Why, How). Chú ý câu trả lời gián tiếp hoặc câu hỏi lựa chọn.',
  },
  3: {
    title: 'Part 3: Đoạn Hội Thoại (Conversations)',
    section: 'Listening',
    description: 'Nghe cuộc đối thoại 2-3 người và trả lời 3 câu hỏi chi tiết/suy luận.',
    advice: 'Tranh thủ đọc lướt câu hỏi trước khi nghe. Chú ý các từ nối chuyển hướng ý (However, Actually, In fact).',
  },
  4: {
    title: 'Part 4: Bài Nói Ngắn (Short Talks)',
    section: 'Listening',
    description: 'Nghe độc thoại (thông báo sân bay, tin nhắn thoại, bản tin) và trả lời câu hỏi.',
    advice: 'Xác định nhanh bối cảnh và đối tượng người nghe ngay từ 2 câu đầu bài phát thanh.',
  },
  5: {
    title: 'Part 5: Hoàn Thành Câu (Incomplete Sentences)',
    section: 'Reading',
    description: 'Điền từ vựng hoặc ngữ pháp phù hợp nhất vào chỗ trống trong câu đơn.',
    advice: 'Phân loại nhanh câu hỏi ngữ pháp (từ loại, chia thì) hay câu từ vựng để xử lý dứt điểm dưới 20 giây.',
  },
  6: {
    title: 'Part 6: Hoàn Thành Đoạn Văn (Text Completion)',
    section: 'Reading',
    description: 'Điền từ, cụm từ hoặc cả câu vào chỗ trống trong 1 bức thư/thông báo.',
    advice: 'Đọc kỹ câu trước và sau chỗ trống để nắm rõ mối quan hệ liên kết logic giữa các ý.',
  },
  7: {
    title: 'Part 7: Đọc Hiểu Văn Bản (Reading Comprehension)',
    section: 'Reading',
    description: 'Đọc hiểu đơn đoạn và đa đoạn văn bản thương mại, email, biểu mẫu và quảng cáo.',
    advice: 'Rèn luyện kỹ năng Skimming tìm ý chính và Scanning tìm thông tin cụ thể; cảnh giác với các từ mang nghĩa tuyệt đối.',
  },
};
