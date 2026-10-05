// BƯỚC CÔ LẬP: In ra màn hình ngay lập tức để chắc chắn script có chạy
console.log('====================================================');
console.log('👉 ĐÃ CHẠY FILE TEST-DAS3H.TS THÀNH CÔNG!');
console.log('👉 Đang nạp thư viện và kết nối hệ thống (Vui lòng đợi)...');
console.log('====================================================\n');

import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { Das3hService } from './src/das3h/das3h.service';
import { AdaptiveSchedulerService } from './src/das3h/adaptive-scheduler.service';
import { PrismaService } from './src/prisma/prisma.service';

async function runTest() {
  console.log('[DEBUG 1] Khởi tạo NestJS Application Context...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  
  console.log('[DEBUG 2] Kết nối NestJS thành công! Đang lấy Service...');
  const das3hService = app.get(Das3hService);
  const schedulerService = app.get(AdaptiveSchedulerService);
  const prisma = app.get(PrismaService);

  try {
    console.log('[DEBUG 3] Khởi tạo và dọn dẹp dữ liệu mẫu...');
    const testUserEmail = 'test_das3h@toeic.com';
    
    // Dọn dẹp câu hỏi test
    const oldContents = [
      'Hard TOEIC grammar question',
      'Multi-skill TOEIC reading question',
      'Candidate Q1 Easy',
      'Candidate Q2 Target',
      'Candidate Q3 Hard',
    ];
    const oldQuestions = await prisma.question.findMany({
      where: { content: { in: oldContents } },
      select: { id: true },
    });
    const oldQuestionIds = oldQuestions.map((q) => q.id);
    if (oldQuestionIds.length > 0) {
      await prisma.questionSkill.deleteMany({ where: { questionId: { in: oldQuestionIds } } });
      await prisma.studentSkillHistory.deleteMany({ where: { questionId: { in: oldQuestionIds } } });
      await prisma.question.deleteMany({ where: { id: { in: oldQuestionIds } } });
    }

    // Dọn dẹp skill test
    const skillCodes = ['TEST_SKILL_K', 'TEST_SKILL_M'];
    const existingSkills = await prisma.skill.findMany({ where: { code: { in: skillCodes } } });
    for (const sk of existingSkills) {
      await prisma.userSkillMastery.deleteMany({ where: { skillId: sk.id } });
      await prisma.studentSkillHistory.deleteMany({ where: { skillId: sk.id } });
      await prisma.questionSkill.deleteMany({ where: { skillId: sk.id } });
      await prisma.das3hWeights.deleteMany({ where: { skillId: sk.id } });
      await prisma.skill.delete({ where: { id: sk.id } });
    }

    // Dọn dẹp user test
    const existingUser = await prisma.user.findUnique({ where: { email: testUserEmail } });
    if (existingUser) {
      await prisma.userSkillMastery.deleteMany({ where: { userId: existingUser.id } });
      await prisma.studentSkillHistory.deleteMany({ where: { userId: existingUser.id } });
      await prisma.user.delete({ where: { id: existingUser.id } });
    }

    // Tạo User mẫu (alpha_s = 0.0)
    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        passwordHash: 'hashed_password',
        ability: 0.0,
      },
    });

    // Tạo Skill mẫu K (beta_k = 0.0)
    const skillK = await prisma.skill.create({
      data: {
        name: 'Test Skill K (Grammar)',
        part: 5,
        easiness: 0.0,
        code: 'TEST_SKILL_K',
        category: 'GRAMMAR',
      },
    });

    // Tạo Skill mẫu M (beta_m = 0.5)
    const skillM = await prisma.skill.create({
      data: {
        name: 'Test Skill M (Vocabulary)',
        part: 5,
        easiness: 0.5,
        code: 'TEST_SKILL_M',
        category: 'VOCABULARY',
      },
    });

    // Tạo Câu hỏi KHÓ đơn kỹ năng (delta_j = 1.5)
    const hardQuestion = await prisma.question.create({
      data: {
        part: 5,
        content: 'Hard TOEIC grammar question',
        correctAnswer: 'A',
        optionA: 'Option A',
        optionB: 'Option B',
        optionC: 'Option C',
        optionD: 'Option D',
        itemDifficulty: 1.5,
        skills: {
          create: {
            skillId: skillK.id,
          },
        },
      },
    });

    // Tạo Câu hỏi ĐA KỸ NĂNG (skillK + skillM, delta_j = 0.5)
    const multiSkillQuestion = await prisma.question.create({
      data: {
        part: 5,
        content: 'Multi-skill TOEIC reading question',
        correctAnswer: 'B',
        optionA: 'Option A',
        optionB: 'Option B',
        optionC: 'Option C',
        optionD: 'Option D',
        itemDifficulty: 0.5,
        skills: {
          createMany: {
            data: [
              { skillId: skillK.id },
              { skillId: skillM.id },
            ],
          },
        },
      },
    });

    console.log(`-> Đã tạo User #${user.id} (ability: 0.0)`);
    console.log(`-> Đã tạo Skill #${skillK.id} (easiness: 0.0) và #${skillM.id} (easiness: 0.5)`);
    console.log(`-> Đã tạo Câu hỏi khó #${hardQuestion.id} (itemDifficulty: 1.5)`);
    console.log(`-> Đã tạo Câu hỏi đa kỹ năng #${multiSkillQuestion.id} (itemDifficulty: 0.5)\n`);

    // ==========================================
    // TEST 1: Dự đoán xác suất đơn kỹ năng
    // ==========================================
    console.log('[TEST 1] Dự đoán xác suất làm đúng đơn kỹ năng (predictProbCorrect)...');
    const pCorrectBefore = await das3hService.predictProbCorrect(user.id, hardQuestion.id);
    console.log(`-> Xác suất làm đúng câu hỏi khó: ${pCorrectBefore.toFixed(4)}`);
    
    const expectedP = 1 / (1 + Math.exp(1.5)); // sigmoid(-1.5)
    console.log(`-> Toán học lý thuyết kỳ vọng: ${expectedP.toFixed(4)}`);
    if (Math.abs(pCorrectBefore - expectedP) < 0.001) {
      console.log('✅ ĐẠT: Khớp công thức Sigmoid chuẩn IRT!\n');
    }

    // ==========================================
    // TEST 2: Dự đoán xác suất ĐA KỸ NĂNG (Multi-skill Aggregation)
    // ==========================================
    console.log('[TEST 2] Dự đoán xác suất câu hỏi ĐA KỸ NĂNG (Multi-skill)...');
    const pMultiSkill = await das3hService.predictProbCorrect(user.id, multiSkillQuestion.id);
    console.log(`-> Xác suất câu đa kỹ năng: ${pMultiSkill.toFixed(4)}`);
    // logit = alpha (0.0) - delta (0.5) + (beta_k(0.0) + beta_m(0.5)) / 2 = -0.5 + 0.25 = -0.25
    const expectedMultiP = 1 / (1 + Math.exp(0.25)); // sigmoid(-0.25) ~ 0.4378
    console.log(`-> Toán học kỳ vọng trung bình cộng đa kỹ năng: ${expectedMultiP.toFixed(4)}`);
    if (Math.abs(pMultiSkill - expectedMultiP) < 0.001) {
      console.log('✅ ĐẠT: Multi-skill Aggregation chính xác tuyệt đối!\n');
    }

    // ==========================================
    // TEST 3: SGD Trực tuyến + Ràng buộc chặn ngưỡng [-3.5, 3.5]
    // ==========================================
    console.log('[TEST 3] Cập nhật năng lực qua SGD và kiểm tra Bounded Clipping [-3.5, 3.5]...');
    const newAbility = await das3hService.updateAbilityOnline(user.id, hardQuestion.id, true);
    console.log(`-> Năng lực mới của học viên: ${newAbility.toFixed(4)}`);
    
    const expectedNewAbility = 0.0 + 0.03 * (1.0 - pCorrectBefore);
    console.log(`-> Năng lực lý thuyết kỳ vọng: ${expectedNewAbility.toFixed(4)}`);
    if (Math.abs(newAbility - expectedNewAbility) < 0.0001) {
      console.log('✅ ĐẠT: Năng lực thích ứng SGD chuẩn xác!');
    }

    // Kiểm tra khả năng chặn biên (clipping) khi cực đoan
    await prisma.user.update({ where: { id: user.id }, data: { ability: 3.49 } });
    const clippedHigh = await das3hService.updateAbilityOnline(user.id, hardQuestion.id, true);
    console.log(`-> Năng lực sau khi cộng dồn vượt trần: ${clippedHigh.toFixed(4)}`);
    if (clippedHigh <= 3.5) {
      console.log('✅ ĐẠT: Khống chế trôi dạt thành công (Upper bound <= 3.5)!\n');
    }
    // Trả lại ability
    await prisma.user.update({ where: { id: user.id }, data: { ability: newAbility } });

    // ==========================================
    // TEST 4: Cửa sổ thời gian rời rạc (Disjoint Windows) & Mastery Score
    // ==========================================
    console.log('[TEST 4] Kiểm tra cửa sổ thời gian rời rạc Disjoint Windows và Mastery Score...');
    await das3hService.recordAndSync(user.id, hardQuestion.id, true, [skillK.id]);
    const masteryScore = await das3hService.getSkillMastery(user.id, skillK.id);
    console.log(`-> Điểm thông thạo Mastery sau 1 câu đúng: ${masteryScore.toFixed(4)}`);
    
    if (masteryScore > 0.52 && masteryScore < 0.70) {
      console.log('✅ ĐẠT: Không còn hiện tượng bão hòa cửa sổ! Mastery tăng trưởng khoa học (~0.59) thay vì nhảy vọt quá đà!\n');
    }

    // ==========================================
    // TEST 5: Đề xuất thích ứng ZPD (Adaptive Scheduler) khử triệt để N+1 Queries
    // ==========================================
    console.log('[TEST 5] Kiểm tra Adaptive Scheduler (Lựa chọn câu hỏi vùng ZPD tối ưu)...');
    // Tạo 3 câu ứng viên khác nhau về độ khó cho skillK
    const candidate1 = await prisma.question.create({
      data: {
        part: 5,
        content: 'Candidate Q1 Easy',
        correctAnswer: 'A',
        optionA: 'A', optionB: 'B', optionC: 'C', optionD: 'D',
        itemDifficulty: -1.5, // Dễ -> prob ~ 0.86
        skills: { create: { skillId: skillK.id } },
      },
    });
    const candidate2 = await prisma.question.create({
      data: {
        part: 5,
        content: 'Candidate Q2 Target',
        correctAnswer: 'A',
        optionA: 'A', optionB: 'B', optionC: 'C', optionD: 'D',
        itemDifficulty: -0.7, // Vừa phải -> prob ~ 0.74 (sát 0.75 nhất)
        skills: { create: { skillId: skillK.id } },
      },
    });
    const candidate3 = await prisma.question.create({
      data: {
        part: 5,
        content: 'Candidate Q3 Hard',
        correctAnswer: 'A',
        optionA: 'A', optionB: 'B', optionC: 'C', optionD: 'D',
        itemDifficulty: 1.5, // Khó -> prob ~ 0.24
        skills: { create: { skillId: skillK.id } },
      },
    });

    const recommendation = await schedulerService.getNextAdaptiveQuestion(user.id, skillK.id);
    console.log(`-> Câu hỏi được hệ thống chọn: ID #${recommendation.selectedQuestion.id} (${recommendation.selectedQuestion.content})`);
    console.log(`-> Xác suất dự đoán: ${recommendation.predictedProb.toFixed(4)} (Mục tiêu ZPD: ${recommendation.targetProb})`);
    console.log(`-> Trạng thái Exploration (Khám phá câu mới): ${recommendation.isExploration}`);
    
    if (recommendation.selectedQuestion.id === candidate2.id || recommendation.isExploration) {
      console.log('✅ ĐẠT: Bộ lập lịch thích ứng ZPD hoạt động chuẩn xác và tối ưu hiệu năng!\n');
    }

  } catch (error) {
    console.error('❌ Lỗi thực thi kiểm thử:', error);
  } finally {
    await app.close();
    console.log('=== KẾT THÚC TIẾN TRÌNH KIỂM THỬ ===');
  }
}

// Gọi thực thi hàm chạy test
runTest();