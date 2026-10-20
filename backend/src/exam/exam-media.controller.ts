import { BadRequestException, Controller, Get, Param, Res } from '@nestjs/common';
import { resolve } from 'node:path';
import type { Response } from 'express';

// Only content-addressed imported exam media are served from this directory.
@Controller('exam/media')
export class ExamMediaController {
  @Get(':name')
  media(@Param('name') name: string, @Res() response: Response) {
    if (!/^[a-f0-9]{64}\.(mp3|wav|jpg|jpeg|png|webp)$/.test(name)) {
      throw new BadRequestException('Tên tài nguyên không hợp lệ.');
    }
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return response.sendFile(name, { root: resolve(process.env.EXAM_MEDIA_DIR || resolve(__dirname, '../../storage/exam')), dotfiles: 'deny' });
  }
}
