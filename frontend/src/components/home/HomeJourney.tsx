import { useState } from 'react';
import { Link } from 'react-router-dom';

const steps = [
  { title: 'Bắt đầu từ chính bạn.', description: 'Xem gợi ý từ lịch sử luyện tập để chọn kỹ năng cần ôn tiếp.', path: '/recommendations', link: 'Xem gợi ý học tiếp', preview: ['Kỹ năng đã luyện', 'Nội dung cần ôn', 'Bài luyện phù hợp'] },
  { title: 'Học theo nhịp của bạn.', description: 'Tập trung vào bài đọc, đoạn nghe và câu hỏi. Tiếp tục bài đã lưu khi bạn sẵn sàng.', path: '/reading', link: 'Khám phá bài luyện', preview: ['Đọc bài và tìm thông tin', 'Chọn câu trả lời', 'Kiểm tra và xem giải thích'] },
  { title: 'Hiểu kết quả. Tiến xa hơn.', description: 'Làm đề trong thời gian quy định, xem lại từng câu và chọn nội dung ôn cho buổi tiếp theo.', path: '/exam', link: 'Chọn đề thi thử', preview: ['Làm đề có thời gian', 'Xem lại câu trả lời', 'Ôn lại kiến thức'] },
];

export function HomeJourney() {
  const [selected, setSelected] = useState(0);
  const step = steps[selected];
  return <section className="prep-home-journey" aria-labelledby="prep-journey-title"><div className="prep-home-heading"><h2 id="prep-journey-title">Hành trình học<br />rõ ràng từng bước.</h2><p>Từ chọn trọng tâm đến luyện tập và xem lại kết quả.</p></div>
    <div className="prep-home-step-controls" aria-label="Chọn bước trong hành trình">{steps.map((item, index) => <button key={item.path} type="button" aria-pressed={selected === index} aria-controls="prep-journey-panel" onClick={() => setSelected(index)}>Bước 0{index + 1}</button>)}</div>
    <div id="prep-journey-panel" className="prep-home-journey-panel"><div key={step.path} className="journey-step-content"><p className="prep-home-step-number">0{selected + 1}</p><h3>{step.title}</h3><p>{step.description}</p><Link className="prep-home-white-button" to={step.path}>{step.link}</Link></div><div key={selected} className="prep-home-product-preview journey-step-content" aria-label={`Minh họa các thao tác trong bước ${selected + 1}`}><p className="prep-home-preview-brand">TOEIC Adaptive · Minh họa luồng học</p><h4>{selected === 0 ? 'Trọng tâm buổi học' : selected === 1 ? 'Không gian luyện tập' : 'Xem lại bài thi'}</h4><ol>{step.preview.map((text, index) => <li key={text}><span>{index + 1}</span>{text}</li>)}</ol><p className="prep-home-preview-note">{selected === 0 ? 'Gợi ý dựa trên lịch sử luyện của bạn.' : selected === 1 ? 'Lưu bài để tiếp tục vào lần sau.' : 'Kết quả hiển thị sau khi nộp bài.'}</p></div></div>
  </section>;
}

export function HomeTechnology() {
  return <section className="prep-home-technology" aria-labelledby="prep-technology-title"><div className="prep-home-heading"><h2 id="prep-technology-title">Công nghệ hỗ trợ.<br />Bạn làm chủ việc học.</h2></div><div className="prep-home-technology-content"><div><p className="prep-home-step-number">01</p><h3>Biết nên học gì tiếp theo.</h3><p>Gợi ý kỹ năng từ lịch sử luyện giúp bạn tìm trọng tâm cho buổi học. Trợ lý AI hỗ trợ giải đáp khi cần.</p><Link className="prep-home-white-button" to="/recommendations">Khám phá gợi ý</Link></div><div className="prep-home-product-preview"><p className="prep-home-preview-brand">TOEIC Adaptive · Minh họa luồng học</p><h4>Học đúng trọng tâm</h4><div className="prep-home-preview-feature"><strong>01 · Gợi ý học tiếp</strong><p>Dựa trên các kỹ năng bạn đã luyện.</p></div><div className="prep-home-preview-feature"><strong>02 · Trợ lý học tập</strong><p>Hỏi và trao đổi về nội dung đang học.</p></div><div className="prep-home-preview-feature"><strong>03 · Giải thích câu trả lời</strong><p>Xem lại kiến thức sau bài luyện.</p></div></div></div></section>;
}


