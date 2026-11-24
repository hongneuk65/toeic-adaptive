import type { KnowledgeChunk, Prisma } from '@prisma/client';
import { knowledgeHash } from './tutor-knowledge.service';

export interface KnowledgeReviewInput { sourceUri: string; sourceVersion: string; reviewedBy: string }
type KnowledgeDb = { knowledgeChunk: Pick<Prisma.KnowledgeChunkDelegate, 'updateMany'> };

export class KnowledgeReviewError extends Error {
  constructor(message: string, readonly kind: 'invalid' | 'conflict') { super(message); }
}

/** Same rules the retriever enforces in isApprovedKnowledge: HTTPS without credentials, a revision and a reviewer. */
export function assertReviewInput(input: KnowledgeReviewInput) {
  let url: URL | undefined;
  try { url = new URL(input.sourceUri); } catch { url = undefined; }
  if (!url || url.protocol !== 'https:' || url.username || url.password)
    throw new KnowledgeReviewError('Nguồn tham khảo phải là đường dẫn https:// hợp lệ, không chứa thông tin đăng nhập', 'invalid');
  if (!input.sourceVersion?.trim()) throw new KnowledgeReviewError('Cần ghi phiên bản nguồn', 'invalid');
  if (!input.reviewedBy?.trim()) throw new KnowledgeReviewError('Thiếu người duyệt', 'invalid');
}

/**
 * Records an explicit human approval of exactly the content the reviewer saw.
 * Optimistic lock on updatedAt: any edit since it was read makes the approval fail.
 * Shared by the admin API and scripts/review-tutor-knowledge.cjs.
 */
export async function approveKnowledge(db: KnowledgeDb, row: KnowledgeChunk, input: KnowledgeReviewInput) {
  assertReviewInput(input);
  const sourceUri = input.sourceUri.trim(), sourceVersion = input.sourceVersion.trim(), reviewedBy = input.reviewedBy.trim();
  const approvedContentHash = knowledgeHash({ ...row, sourceUri, sourceVersion });
  const result = await db.knowledgeChunk.updateMany({ where: { id: row.id, updatedAt: row.updatedAt },
    data: { sourceUri, sourceVersion, reviewedBy, reviewedAt: new Date(), approvedContentHash, reviewStatus: 'APPROVED' } });
  if (result.count !== 1) throw new KnowledgeReviewError('Nội dung đã thay đổi trong lúc duyệt. Tải lại rồi duyệt lại.', 'conflict');
  return { approvedContentHash };
}

export async function revokeKnowledge(db: KnowledgeDb, id: number) {
  const result = await db.knowledgeChunk.updateMany({ where: { id }, data: { reviewStatus: 'REVOKED' } });
  if (result.count !== 1) throw new KnowledgeReviewError('Không tìm thấy tài liệu', 'invalid');
}
