import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Response } from 'express';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ListeningService } from './listening.service';
import { AnswerDto, ProgressDto, PublishDto, ReportDto, SegmentDto, SettingsDto, SourceDto, SubtitleDto, TranscriptRequestDto } from './listening.dto';

interface ListeningRequest { user: { id: number; role: Role } }
export const mediaDirectory = () => resolve(process.env.LISTENING_MEDIA_DIR || './storage/listening');

@Controller('listening')
@UseGuards(AuthGuard('jwt'))
export class ListeningController {
  constructor(private readonly service: ListeningService) {}
  @Get() list(@Req() req: ListeningRequest) { return this.service.list(req.user.id); }
  @Post('sources') create(@Req() req: ListeningRequest, @Body() dto: SourceDto) { return this.service.createSource(req.user.id, dto); }
  @Get('sources/:id') status(@Req() req: ListeningRequest, @Param('id', ParseIntPipe) id: number, @Query('start') start?: string, @Query('end') end?: string) {
    if ((start === undefined) !== (end === undefined) || (start !== undefined && (!Number.isFinite(Number(start)) || !Number.isFinite(Number(end)) || Number(start) < 0 || Number(end) <= Number(start) || Number(end) > 86400))) throw new BadRequestException('Đoạn không hợp lệ.');
    return this.service.sourceStatus(req.user.id, id, false, start === undefined ? undefined : { start: Number(start), end: Number(end) });
  }
  @Post('sources/:id/transcript') retry(@Req() req: ListeningRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: TranscriptRequestDto) { return this.service.requestTranscript(req.user.id, id, false, dto); }
  @Post('sources/:id/audio')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10_000_000, files: 1 } }))
  audio(@Req() req: ListeningRequest, @Param('id', ParseIntPipe) id: number, @UploadedFile() file: { buffer: Buffer } | undefined, @Body('start') start: string, @Body('end') end: string) {
    if (!file || !start?.trim() || !end?.trim()) throw new BadRequestException('Chọn file audio và mốc đoạn tương ứng.');
    return this.service.uploadAudio(req.user.id, id, file.buffer, Number(start), Number(end));
  }
  @Delete('sources/:id') remove(@Req() req: ListeningRequest, @Param('id', ParseIntPipe) id: number) { return this.service.removeSource(req.user.id, id); }
  @Post('sources/:id/restore') restore(@Req() req: ListeningRequest, @Param('id', ParseIntPipe) id: number) { return this.service.restoreSource(req.user.id, id); }
  @Post('sources/:id/reports') report(@Req() req: ListeningRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: ReportDto) { return this.service.report(req.user.id, id, dto.reason); }
  @Post('sessions') start(@Req() req: ListeningRequest, @Body() dto: SegmentDto) { return this.service.start(req.user.id, dto); }
  @Get('sessions/:id') session(@Req() req: ListeningRequest, @Param('id', ParseIntPipe) id: number) { return this.service.session(req.user.id, id); }
  @Patch('sessions/:id') progress(@Req() req: ListeningRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: ProgressDto) { return this.service.progress(req.user.id, id, dto); }
  @Post('sessions/:id/answers') answer(@Req() req: ListeningRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: AnswerDto) { return this.service.answer(req.user.id, id, dto); }
  @Get('sessions/:id/hint') hint(@Req() req: ListeningRequest, @Param('id', ParseIntPipe) id: number) { return this.service.hint(req.user.id, id); }
}

@Controller('listening/admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class ListeningAdminController {
  constructor(private readonly service: ListeningService, private readonly prisma: PrismaService) {}
  @Get() overview() { return this.service.adminOverview(); }
  @Post('sources') create(@Req() req: ListeningRequest, @Body() dto: SourceDto) { return this.service.createSource(req.user.id, dto, true); }
  @Patch('sources/:id') publish(@Param('id', ParseIntPipe) id: number, @Body() dto: PublishDto) { return this.service.publish(id, dto.published); }
  @Post('sources/:id/subtitles') import(@Req() req: ListeningRequest, @Param('id', ParseIntPipe) id: number, @Body() dto: SubtitleDto) { return this.service.importTranscript(req.user.id, id, dto, true); }
  @Post('sources/:id/transcript') retry(@Req() req: ListeningRequest, @Param('id', ParseIntPipe) id: number) { return this.service.requestTranscript(req.user.id, id, true); }
  @Patch('settings') settings(@Body() dto: SettingsDto) { return this.service.updateSettings(dto); }
  @Patch('reports/:id') resolve(@Param('id', ParseIntPipe) id: number) { return this.prisma.listeningReport.update({ where: { id }, data: { resolved: true } }); }
  @Get('system-audio') audio() { return this.prisma.question.findMany({ where: { audioUrl: { not: null } }, select: { id: true, audioUrl: true, content: true }, take: 100 }); }
  @Post('media')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024, files: 1 } }))
  async upload(@Req() req: ListeningRequest, @UploadedFile() file?: { buffer: Buffer; mimetype: string }) {
    await this.service.limit(req.user.id, 'media', 10);
    if (!file) throw new BadRequestException('Chọn file audio/video tối đa 20 MB.');
    const data = file.buffer;
    let extension = '';
    if (data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WAVE') extension = 'wav';
    else if (data.subarray(0, 3).toString() === 'ID3' || (data[0] === 0xff && (data[1] & 0xe0) === 0xe0)) extension = 'mp3';
    else if (data.subarray(4, 8).toString() === 'ftyp') extension = 'mp4';
    else if (data.subarray(0, 4).toString('hex') === '1a45dfa3') extension = 'webm';
    if (!extension) throw new BadRequestException('Chỉ hỗ trợ WAV, MP3, MP4 hoặc WebM hợp lệ.');
    const name = `${randomUUID()}.${extension}`; await mkdir(mediaDirectory(), { recursive: true }); await writeFile(resolve(mediaDirectory(), name), data);
    return { url: `/api/listening/media/${name}`, kind: ['wav', 'mp3'].includes(extension) ? 'AUDIO' : 'VIDEO' };
  }
}

// Uploaded admin media are public resources; private recordings never reach this endpoint.
@Controller('listening/media')
export class ListeningMediaController {
  @Get(':name') media(@Param('name') name: string, @Res() response: Response) {
    if (!/^[a-f0-9-]{36}\.(wav|mp3|mp4|webm)$/.test(name)) throw new BadRequestException('Tên tài nguyên không hợp lệ.');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return response.sendFile(name, { root: mediaDirectory(), dotfiles: 'deny' });
  }
}
