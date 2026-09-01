import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Lấy thử 1 skill của Part 5
  const skill = await prisma.skill.findFirst({
    where: { part: 5 },
  });

  if (!skill) {
    console.log('Chưa có skill Part 5, hãy chạy seed:skills trước!');
    return;
  }

  const lesson = await prisma.theoryLesson.create({
    data: {
      title: 'Các thì động từ căn bản trong TOEIC Part 5',
      content: '## 1. Thì hiện tại đơn...\n## 2. Dấu hiệu nhận biết: always, usually, often...',
      part: 5,
      skillId: skill.id,
    },
  });

  console.log(`✔ Đã tạo bài học mẫu: "${lesson.title}" với ID: ${lesson.id}`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());