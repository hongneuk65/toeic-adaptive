import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Trọng số tiên nghiệm Ebbinghaus đơn điệu phân rã theo thời gian (Tổng biên độ |theta| <= 1.5)
const INITIAL_THETA = [0.50, -0.35, 0.35, -0.25, 0.25, -0.18, 0.15, -0.10, 0.08, -0.05];

async function main() {
  console.log('🔄 Đang kiểm tra và nạp Das3hWeights cho các kỹ năng...');

  const skills = await prisma.skill.findMany();

  if (skills.length === 0) {
    console.log('⚠️ Bảng Skill đang trống. Hãy nạp danh mục Skill trước!');
    return;
  }

  let count = 0;
  for (const skill of skills) {
    await prisma.das3hWeights.upsert({
      where: { skillId: skill.id },
      update: {
        theta: INITIAL_THETA,
      },
      create: {
        skillId: skill.id,
        theta: INITIAL_THETA,
      },
    });
    count++;
  }

  console.log(`✅ Đã nạp thành công 10 trọng số theta cho ${count} kỹ năng!`);
}

main()
  .catch((e) => {
    console.error('Lỗi seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });