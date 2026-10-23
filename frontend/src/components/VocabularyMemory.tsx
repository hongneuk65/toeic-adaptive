export interface VocabularyMemoryEstimate { probability: number | null; halfLifeDays: number | null; source: string; lastPracticedAt: string | null; estimated: boolean }

export function VocabularyMemory({ memory, estimatedAt, currentTime }: { memory?: VocabularyMemoryEstimate; estimatedAt: number; currentTime: number }) {
  if (!memory || !memory.source.startsWith('hlr-') || memory.probability === null || memory.halfLifeDays === null || !Number.isFinite(memory.probability) || !Number.isFinite(memory.halfLifeDays) || memory.halfLifeDays <= 0 || memory.probability < 0 || memory.probability > 1) return null;
  const ageDays = Math.max(0, currentTime - estimatedAt) / 86400000;
  const probability = memory.probability * Math.pow(2, -ageDays / memory.halfLifeDays);
  const horizon = Math.min(30, Math.max(1, memory.halfLifeDays * 2));
  const projection = (days: number) => probability * Math.pow(2, -days / memory.halfLifeDays!);
  const points = Array.from({ length: 31 }, (_, index) => `${10 + index * 8},${90 - projection(horizon * index / 30) * 80}`).join(' ');
  return <section aria-label="Ước tính ghi nhớ từ vựng" className="rounded-xl border border-paper-kraft bg-paper-white p-4 space-y-2 text-sm">
    <h3 className="font-semibold">Đường cong ghi nhớ · {memory.source.startsWith('hlr-trained:') ? 'ước tính từ dữ liệu ôn' : 'ước tính thử nghiệm'}</h3>
    <p>Khả năng nhớ ước tính hiện tại: {Math.round(probability * 100)}%. Nếu chưa ôn lại: sau 1 ngày khoảng {Math.round(projection(1) * 100)}%, sau 7 ngày khoảng {Math.round(projection(7) * 100)}%.</p>
    <p className="text-xs text-ink-medium">Dữ liệu ôn cập nhật lúc {new Date(estimatedAt).toLocaleString('vi-VN')}; dự báo giảm theo thời gian kể từ lần cập nhật này.</p>
    <svg role="img" aria-label={`Dự báo khả năng nhớ giảm từ ${Math.round(probability * 100)}% xuống khoảng ${Math.round(projection(horizon) * 100)}% trong ${Math.round(horizon)} ngày nếu không ôn lại`} viewBox="0 0 260 110" className="w-full max-w-sm h-28"><path d="M10 10 V90 H250" fill="none" stroke="currentColor" opacity="0.3" /><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" /><text x="10" y="106" fontSize="10">Hôm nay</text><text x="195" y="106" fontSize="10">+{Math.round(horizon)} ngày</text></svg>
    <p className="text-xs text-ink-medium">Dựa trên kiểm tra gõ đáp án; đây là dự báo, không phải mức thành thạo đo được. Ôn lại sẽ cập nhật lịch và đường cong.</p>
  </section>;
}
