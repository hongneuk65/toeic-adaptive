import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import { ExamController } from '../exam/exam.controller';
import { TheoryController } from '../theory/theory.controller';
import { MasteryController } from '../mastery/mastery.controller';
import { RagController } from '../rag/rag.controller';
import { ReadingController, ReadingAdminController } from '../reading/reading.controller';
import { ListeningController, ListeningAdminController } from '../listening/listening.controller';
import { FlashcardController } from '../flashcard/flashcard.controller';
import { Das3hController } from '../das3h/das3h.controller';

describe('Separate learner and administrator permissions', () => {
  const guard = new RolesGuard(new Reflector());
  function context(controller: object, role: Role, handler: object = () => {}) {
    return { getClass: () => controller, getHandler: () => handler,
      switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    } as unknown as ExecutionContext;
  }
  it.each([ExamController, TheoryController, MasteryController, RagController,
    ReadingController, ListeningController, FlashcardController, Das3hController])(
    'allows learners and rejects administrators on %p', controller => {
      expect(guard.canActivate(context(controller, Role.USER))).toBe(true);
      expect(() => guard.canActivate(context(controller, Role.ADMIN))).toThrow(ForbiddenException);
    });
  it.each([ReadingAdminController, ListeningAdminController])(
    'preserves management access on %p', controller => {
      expect(guard.canActivate(context(controller, Role.ADMIN))).toBe(true);
      expect(() => guard.canActivate(context(controller, Role.USER))).toThrow(ForbiddenException);
    });
  it('preserves explicit administrator maintenance handlers', () => {
    expect(guard.canActivate(context(Das3hController, Role.ADMIN, Das3hController.prototype.testQueue))).toBe(true);
    expect(() => guard.canActivate(context(Das3hController, Role.USER, Das3hController.prototype.testQueue))).toThrow(ForbiddenException);
  });
});
