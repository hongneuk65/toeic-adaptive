import { jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { LocalAsrProvider } from './local-asr.provider';
import { AnswerDto } from './listening.dto';
import { ListeningService } from './listening.service';

describe('durable listening answer retries', () => {
  const dto = { requestId: '900da747-7693-4afa-9a8e-73b789123ed0', unitId: 4, mode: 'DICTATION', difficulty: 'EASY', answer: 'The office opens at nine.' };
  function setup() {
    const rows = new Map<string, Record<string, unknown>>();
    const findUnique = jest.fn<(...args: any[]) => Promise<any>>().mockImplementation(async ({ where }) => {
      const key = where.requestUserId_requestId;
      return rows.get(`${key.requestUserId}:${key.requestId}`) ?? null;
    });
    const create = jest.fn<(...args: any[]) => Promise<any>>().mockImplementation(async ({ data }) => {
      const key = `${data.requestUserId}:${data.requestId}`;
      if (data.requestId && rows.has(key)) throw { code: 'P2002' };
      const row = { id: rows.size + 1, ...data };
      rows.set(data.requestId ? key : `legacy:${rows.size}`, row);
      return row;
    });
    const service = new ListeningService({ listeningAnswer: { findUnique, create } } as unknown as PrismaService, {} as Queue, {} as LocalAsrProvider);
    const own = jest.spyOn(service, 'ownedSession').mockResolvedValue({ currentIndex: 0, mode: 'DICTATION', difficulty: 'EASY', transcript: { provider: 'manual' } } as never);
    jest.spyOn(service, 'units').mockResolvedValue([{ id: 4, text: 'The office opens at nine.' }] as never);
    const limit = jest.spyOn(service, 'limit').mockResolvedValue(undefined);
    return { service, rows, create, own, limit };
  }
  it('replays a saved result after response loss, even after the session moves forward', async () => {
    const { service, rows, own, limit } = setup();
    const first = await service.answer(7, 2, dto);
    own.mockResolvedValue({ currentIndex: 1, mode: 'CLOZE', difficulty: 'HARD' } as never);
    expect(await service.answer(7, 2, dto)).toEqual(first);
    expect(rows.size).toBe(1);
    expect(limit).toHaveBeenCalledTimes(1);
    expect(own).toHaveBeenLastCalledWith(7, 2);
  });
  it('the database unique key arbitrates concurrent identical requests', async () => {
    const { service, rows } = setup();
    const [a, b] = await Promise.all([service.answer(7, 2, dto), service.answer(7, 2, dto)]);
    expect(a).toEqual(b);
    expect(rows.size).toBe(1);
  });
  it('rejects reuse with different content or session and scopes IDs to the user', async () => {
    const { service, rows } = setup();
    await service.answer(7, 2, dto);
    await expect(service.answer(7, 2, { ...dto, answer: 'A different answer.' })).rejects.toBeInstanceOf(ConflictException);
    await expect(service.answer(7, 3, dto)).rejects.toBeInstanceOf(ConflictException);
    await service.answer(8, 2, dto);
    expect(rows.size).toBe(2);
  });
  it('accepts legacy callers and rejects malformed optional request identifiers', async () => {
    const { requestId: _, ...legacy } = dto;
    expect(await validate(plainToInstance(AnswerDto, legacy))).toHaveLength(0);
    expect(await validate(plainToInstance(AnswerDto, dto))).toHaveLength(0);
    expect((await validate(plainToInstance(AnswerDto, { ...dto, requestId: 'bad' }))).length).toBeGreaterThan(0);
    const { service, create } = setup();
    await service.answer(7, 2, legacy);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.not.objectContaining({ requestId: expect.anything() }) }));
  });
});
