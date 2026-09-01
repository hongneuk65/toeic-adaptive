import { PrismaClient, Difficulty } from '@prisma/client';

const prisma = new PrismaClient();

// Bảng số lượng câu hỏi cần sinh theo từng Part để đủ cho đề FULL 200 câu
// (Tổng cộng 300 câu: Part 1: 10 câu, Part 2: 35 câu, Part 3: 45 câu, Part 4: 40 câu, Part 5: 60 câu, Part 6: 30 câu, Part 7: 80 câu)
const PART_DISTRIBUTION = [
  { part: 1, count: 10, defaultDelta: 10.8 },
  { part: 2, count: 35, defaultDelta: 11.2 },
  { part: 3, count: 45, defaultDelta: 11.9 },
  { part: 4, count: 40, defaultDelta: 12.3 },
  { part: 5, count: 60, defaultDelta: 11.5 },
  { part: 6, count: 30, defaultDelta: 12.1 },
  { part: 7, count: 80, defaultDelta: 12.8 },
];

async function main() {
  console.log('--- Bắt đầu seed bulk 300 câu hỏi cho đề thi FULL ---');

  // Lấy toàn bộ Skill đã có trong DB
  const skills = await prisma.skill.findMany();
  if (skills.length === 0) {
    console.error('Chưa có dữ liệu Skill! Hãy chạy npm run seed:skills trước.');
    return;
  }

  const skillsByPart = new Map<number, number[]>();
  for (const s of skills) {
    if (!skillsByPart.has(s.part)) {
      skillsByPart.set(s.part, []);
    }
    skillsByPart.get(s.part)!.push(s.id);
  }

  const options = ['A', 'B', 'C', 'D'];
  const difficulties: Difficulty[] = [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD];

  let totalCreated = 0;

  for (const dist of PART_DISTRIBUTION) {
    const availableSkillIds = skillsByPart.get(dist.part) || [skills[0].id];

    for (let i = 1; i <= dist.count; i++) {
      const correctAns = options[Math.floor(Math.random() * options.length)];
      const diff = difficulties[Math.floor(Math.random() * difficulties.length)];
      const randomSkillId = availableSkillIds[Math.floor(Math.random() * availableSkillIds.length)];

      await prisma.question.create({
        data: {
          part: dist.part,
          content: `[Part ${dist.part} - Question #${i}] This is a practice question generated for bulk testing purposes.`,
          passage: dist.part >= 6 ? `Passage content for Part ${dist.part} question #${i}. Please read carefully before answering.` : null,
          audioUrl: dist.part <= 4 ? `https://storage.toeic.test/audios/part${dist.part}_q${i}.mp3` : null,
          imageUrl: dist.part === 1 ? `https://storage.toeic.test/images/part1_q${i}.jpg` : null,
          optionA: 'Option A: The proposed solution meets initial requirements.',
          optionB: 'Option B: The shipment will be delivered ahead of schedule.',
          optionC: 'Option C: Customer feedback indicated broad satisfaction.',
          optionD: 'Option D: Additional budget approval is currently pending.',
          correctAnswer: correctAns,
          explanation: `Giải thích chi tiết cho câu hỏi số #${i} của Part ${dist.part}: Đáp án chính xác là ${correctAns}.`,
          difficulty: diff,
          itemDifficulty: dist.defaultDelta,
          skills: {
            create: [
              {
                skill: { connect: { id: randomSkillId } },
              },
            ],
          },
        },
      });

      totalCreated++;
    }
    console.log(`✔ Đã tạo ${dist.count} câu hỏi cho Part ${dist.part}`);
  }

  console.log(`🎉 Hoàn tất seed! Tổng số câu hỏi mới tạo: ${totalCreated} câu.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });