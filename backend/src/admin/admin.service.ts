import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';

// Equated Delta trung bình theo từng Part (dữ liệu pilot ETS 2018)
const INITIAL_DELTA_BY_PART: Record<number, number> = {
  1: 10.8,
  2: 11.2,
  3: 11.9,
  4: 12.3,
  5: 11.5,
  6: 12.1,
  7: 12.8,
};

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getAllSkills() {
    return this.prisma.skill.findMany({
      orderBy: [{ part: 'asc' }, { id: 'asc' }],
    });
  }

  async createQuestion(dto: CreateQuestionDto) {
    // Kiểm tra tính hợp lệ của các skillId
    const skillsCount = await this.prisma.skill.count({
      where: { id: { in: dto.skillIds } },
    });
    if (skillsCount !== dto.skillIds.length) {
      throw new NotFoundException('Một hoặc nhiều skillId không tồn tại');
    }

    const defaultDelta = INITIAL_DELTA_BY_PART[dto.part] || 11.5;

    // Lưu Question và tự động tạo các bản ghi liên kết QuestionSkill trong transaction
    const question = await this.prisma.question.create({
      data: {
        part: dto.part,
        passage: dto.passage,
        audioUrl: dto.audioUrl,
        imageUrl: dto.imageUrl,
        content: dto.content,
        optionA: dto.optionA,
        optionB: dto.optionB,
        optionC: dto.optionC,
        optionD: dto.optionD,
        correctAnswer: dto.correctAnswer,
        explanation: dto.explanation,
        difficulty: dto.difficulty,
        itemDifficulty: defaultDelta,
        skills: {
          create: dto.skillIds.map((id) => ({
            skill: { connect: { id } },
          })),
        },
      },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });

    return question;
  }
}