import { learnerExplanation } from './learner-explanation';
describe('learner explanation',()=>{
  it('removes import metadata without changing the stored source marker',()=>{
    const raw='[santa-ednet:q11619]\nDiễn giải\n1. Chọn tính từ.\n\nNguồn/mapping: {"source":"data/raw/private.json"}\nĐộ khó khởi tạo, chưa hiệu chỉnh.';
    expect(learnerExplanation(raw)).toBe('Diễn giải\n1. Chọn tính từ.');
    expect(raw).toContain('[santa-ednet:');
  });
  it('decodes entities and strips redundant presentation prefixes',()=>{
    expect(learnerExplanation('**Giải thích:&#x20;**[santa-ednet:q1] A &amp; B &#39;designs&#39;.')).toBe("A & B 'designs'.");
    expect(learnerExplanation('[admin-question]\nCâu do giáo viên viết.')).toBe('Câu do giáo viên viết.');
    expect(learnerExplanation(null)).toBe('');
  });
});
