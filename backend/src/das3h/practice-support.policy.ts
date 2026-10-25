import { topicForSkill, LEARNING_TOPICS } from '../mastery/learning-topics';

export interface PracticeSupportStep { title: string; body: string; }
type TopicId = typeof LEARNING_TOPICS[number]['id'];
type Steps = readonly [PracticeSupportStep, PracticeSupportStep, PracticeSupportStep];

// Authored study strategies, not a diagnosis of the learner's mistake or a
// question-specific solution. No answer key or generated explanation is used.
const TOPIC_STEPS: Record<TopicId, Steps> = {
  'photo-description': [
    { title: 'Quan sát trước khi nghe lại', body: 'Xác định người, đồ vật và vị trí nổi bật trong tranh. Phân biệt hành động đang diễn ra với trạng thái của đồ vật.' },
    { title: 'Đối chiếu từng mô tả', body: 'Nghe lại chủ ngữ và động từ của mỗi phương án, rồi kiểm tra chúng có khớp điều nhìn thấy hay không.' },
    { title: 'Kiểm tra chi tiết quyết định', body: 'So sánh vị trí, số lượng và thể chủ động hoặc bị động. Chỉ giữ mô tả có bằng chứng trong hình, không thêm tình huống do mình suy đoán.' },
  ],
  'question-response': [
    { title: 'Xác định ý định của câu nói', body: 'Nghe lại câu đầu để nhận ra người nói đang hỏi thông tin, đưa lời đề nghị hay phát biểu một điều gì.' },
    { title: 'Xác định phản hồi cần thiết', body: 'Với câu hỏi thông tin, tìm loại thông tin cần trả lời; với lời đề nghị hoặc phát biểu, xét phản hồi có phù hợp tình huống không.' },
    { title: 'Kiểm tra nghĩa thay vì từ giống nhau', body: 'Nghe toàn bộ phản hồi và nối nghĩa với câu đầu. Câu trả lời có thể gián tiếp; từ lặp lại hoặc âm gần giống chưa đủ để chọn.' },
  ],
  'listening-main-detail': [
    { title: 'Xác định điều cần nghe', body: 'Đọc lại yêu cầu và phân biệt câu hỏi về chủ đề, mục đích, người nói hay một chi tiết cụ thể.' },
    { title: 'Tìm đoạn chứa bằng chứng', body: 'Nghe lại phần liên quan; ghi ngắn người, việc, thời gian hoặc địa điểm phù hợp với điều câu hỏi đang yêu cầu.' },
    { title: 'Đối chiếu cách diễn đạt', body: 'So sánh ý nghĩa của bằng chứng với phương án. Chấp nhận cách diễn đạt tương đương nhưng kiểm tra các thay đổi về thời gian, đối tượng và mục đích.' },
  ],
  'listening-inference': [
    { title: 'Dựng lại bối cảnh', body: 'Xác định ai đang nói với ai, về việc gì và vấn đề nào đang cần giải quyết.' },
    { title: 'Nghe tín hiệu trước và sau', body: 'Nghe lại câu liên quan cùng những câu xung quanh. Tìm lời yêu cầu, trở ngại, lời giải thích hoặc kế hoạch hỗ trợ cho ngụ ý.' },
    { title: 'Giới hạn suy luận bằng bằng chứng', body: 'Chọn cách hiểu hoặc hành động được bối cảnh hỗ trợ. Loại suy đoán cần thêm thông tin mà đoạn nghe không cung cấp.' },
  ],
  'listening-visual': [
    { title: 'Đọc cấu trúc bảng hoặc hình', body: 'Nhìn tiêu đề, tên hàng/cột, đơn vị và chú giải để biết mỗi dữ kiện trên hình đại diện cho điều gì.' },
    { title: 'Nghe điều kiện cần đối chiếu', body: 'Nghe lại để xác định tên, thời điểm, số lượng hoặc thay đổi được nhắc đến, rồi tìm dòng tương ứng trên hình.' },
    { title: 'Ghép đủ hai nguồn thông tin', body: 'Kiểm tra phương án bằng cả đoạn nghe và hình. Chú ý đơn vị, mốc thời gian và việc thông tin ban đầu đã được điều chỉnh hay chưa.' },
  ],
  'word-forms': [
    { title: 'Xác định vai trò của chỗ trống', body: 'Đọc cả câu và tìm chủ ngữ, động từ chính cùng các thành phần quanh chỗ trống để xác định vai trò ngữ pháp cần điền.' },
    { title: 'So sánh cấu trúc các phương án', body: 'Phân biệt danh từ, động từ, tính từ và trạng từ; xét phương án nào phù hợp cấu trúc câu thay vì chỉ dựa vào đuôi từ.' },
    { title: 'Đọc lại câu hoàn chỉnh', body: 'Thử phương án trong toàn câu và kiểm tra cả cấu trúc lẫn nghĩa. Nếu có nhiều khả năng, tìm thêm tín hiệu từ thành phần được bổ nghĩa.' },
  ],
  'verbs': [
    { title: 'Xác định mốc và quan hệ thời gian', body: 'Tìm trạng ngữ thời gian, ngữ cảnh và quan hệ giữa các hành động; xác định câu đang mô tả sự kiện, quá trình hay trạng thái.' },
    { title: 'Kiểm tra chủ ngữ và thể', body: 'Xác định chủ ngữ thực hiện hay tiếp nhận hành động, rồi kiểm tra cấu trúc của thì, thể hoặc động từ khuyết thiếu phù hợp.' },
    { title: 'Đối chiếu toàn bộ câu', body: 'Đọc lại câu với dạng động từ đã chọn. Kiểm tra sự hòa hợp, quan hệ thời gian và nghĩa trong ngữ cảnh, không chọn chỉ từ một từ khóa.' },
  ],
  'connections': [
    { title: 'Tách các ý đang liên kết', body: 'Đọc hai vế hoặc hai câu quanh vị trí cần điền, rồi diễn đạt ngắn nội dung của từng ý.' },
    { title: 'Xác định quan hệ và cấu trúc', body: 'Xét quan hệ bổ sung, nguyên nhân, tương phản, điều kiện hoặc trình tự; kiểm tra sau chỗ trống là cụm từ hay mệnh đề.' },
    { title: 'Kiểm tra mạch văn', body: 'Thử phương án rồi đọc lại đoạn. Kiểm tra từ tham chiếu, dấu câu và trình tự thông tin để bảo đảm liên kết phù hợp cả cấu trúc lẫn nghĩa.' },
  ],
  'context-vocabulary': [
    { title: 'Tóm tắt tình huống', body: 'Đọc câu và phần ngữ cảnh liên quan để xác định người, hành động, mục đích và điều thông tin đang mô tả.' },
    { title: 'So sánh nghĩa và cách kết hợp', body: 'Xét nghĩa của từng từ hoặc cụm từ trong tình huống đó, đồng thời kiểm tra từ đi kèm và vai trò ngữ pháp.' },
    { title: 'Thử diễn đạt lại', body: 'Thay phương án vào câu hoặc diễn đạt lại ý bằng từ quen thuộc. Kiểm tra sắc thái và đối tượng có còn đúng với văn cảnh không.' },
  ],
  'reading-information': [
    { title: 'Khoanh vùng yêu cầu', body: 'Xác định câu hỏi đang cần mục đích chung hay chi tiết cụ thể; chú ý yêu cầu phủ định như NOT hoặc không được đề cập.' },
    { title: 'Tìm bằng chứng trong văn bản', body: 'Tìm tên, thời gian hoặc ý tương đương với yêu cầu, rồi đọc cả câu và phần xung quanh thay vì chỉ ghép từ khóa.' },
    { title: 'Đối chiếu từng phương án', body: 'Kiểm tra thông tin đúng đối tượng, thời điểm và phạm vi. Với câu hỏi phủ định, phân biệt điều trái văn bản với điều văn bản không nêu theo đúng yêu cầu.' },
  ],
  'reading-synthesis': [
    { title: 'Xác định nguồn và điều cần suy ra', body: 'Đọc yêu cầu rồi xác định văn bản hoặc các nguồn có thể chứa dữ kiện cần kết nối.' },
    { title: 'Nối các dữ kiện có chung đối tượng', body: 'Ghi lại thông tin liên quan về người, sản phẩm, lịch hoặc sự kiện; kiểm tra các dữ kiện có nói về cùng đối tượng và cùng mốc thời gian không.' },
    { title: 'Kiểm tra kết luận', body: 'Diễn đạt kết luận từ những dữ kiện đã tìm. Chọn suy luận được hỗ trợ và loại phương án cần giả định thêm ngoài văn bản.' },
  ],
  'reading-context': [
    { title: 'Đọc đoạn quanh chỗ trống', body: 'Đọc câu trước, câu chứa chỗ trống và câu sau để hiểu nội dung đang phát triển theo hướng nào.' },
    { title: 'Kiểm tra cả câu và đoạn', body: 'Xác định yêu cầu ngữ pháp trong câu, rồi đối chiếu thì, đại từ, từ nối và từ vựng với ngữ cảnh của đoạn.' },
    { title: 'Đọc lại mạch hoàn chỉnh', body: 'Thử phương án và kiểm tra thông tin nối tiếp có hợp lý không. Khi cần, đọc rộng hơn để xác nhận đối tượng và thời điểm đang được nói đến.' },
  ],
};

const AGREEMENT_STEPS: Steps = [
  { title: 'Tìm chủ ngữ chính', body: 'Xác định chủ ngữ của động từ cần xét. Tạm tách các cụm bổ nghĩa chen giữa để tránh nhầm danh từ gần động từ với chủ ngữ chính.' },
  { title: 'Kiểm tra sự hòa hợp', body: 'Xét số ít hoặc số nhiều của chủ ngữ và cấu trúc nối các thành phần chủ ngữ. Nếu câu hỏi về đại từ, xác định đối tượng mà đại từ thay thế.' },
  { title: 'Đối chiếu dạng và nghĩa', body: 'So sánh dạng động từ hoặc đại từ với chủ ngữ và thời gian của câu. Đọc lại cả câu để kiểm tra nghĩa và các trường hợp cấu trúc đặc biệt.' },
];

const FALLBACK_STEPS: Steps = [
  { title: 'Đọc lại yêu cầu', body: 'Xác định câu hỏi yêu cầu loại thông tin nào và phần nội dung nào cần kiểm tra lại.' },
  { title: 'Tìm bằng chứng liên quan', body: 'Đọc hoặc nghe lại phần liên quan; ghi ngắn dữ kiện hay cấu trúc giúp giải quyết yêu cầu.' },
  { title: 'Đối chiếu và tự giải thích', body: 'So sánh bằng chứng với từng phương án và lời giải đã có. Tự nêu lý do chọn trước khi luyện một câu khác cùng kỹ năng.' },
];

export function supportStepsForSkill(code: string): PracticeSupportStep[] {
  const topic = topicForSkill(code);
  const steps = code === 'P5_SUBJECT_VERB_AGREE' ? AGREEMENT_STEPS : topic ? TOPIC_STEPS[topic.id] : FALLBACK_STEPS;
  // The caller may serialize or enrich a step without mutating the curriculum.
  return steps.map(step => ({ ...step }));
}
