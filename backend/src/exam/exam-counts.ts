import { BadRequestException } from '@nestjs/common';

export const EXAM_COUNTS = {
  FULL: [6, 25, 39, 30, 30, 16, 54],
  MINI: [3, 12, 21, 15, 15, 8, 26],
  PART_5: [0, 0, 0, 0, 30, 0, 0],
};
export function examCounts(examType: string, parts?: readonly number[]): number[] {
  if (examType !== 'CUSTOM') {
    if (parts?.length) throw new BadRequestException('Chỉ đề CUSTOM nhận danh sách Part.');
    const counts = EXAM_COUNTS[examType as keyof typeof EXAM_COUNTS];
    if (!counts) throw new BadRequestException('Loại đề không hợp lệ.');
    return counts;
  }
  if (!parts?.length || parts.length > 7 || new Set(parts).size !== parts.length || parts.some(part => !Number.isInteger(part) || part < 1 || part > 7)) throw new BadRequestException('Chọn các Part khác nhau từ 1 đến 7.');
  return EXAM_COUNTS.FULL.map((count, index) => parts.includes(index + 1) ? count : 0);
}
