import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  Req,
  UseGuards,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { RagService } from './rag.service';
import { ExplainErrorDto, ChatTutorDto } from './dto/rag.dto';
import { getUserId } from '../common/user-id';

@Controller('rag')
@UseGuards(AuthGuard('jwt'))
export class RagController {
  constructor(private readonly ragService: RagService) {}

  /**
   * 1. Sinh giải thích lỗi sai cá nhân hóa kết hợp RAG + DAS3H
   */
  @Post('explain-error')
  async explainError(@Req() req: any, @Body() dto: ExplainErrorDto) {
    const userId = getUserId(req, 'Không tìm thấy thông tin định danh người dùng trong Token.');
    return this.ragService.explainError(userId, dto);
  }

  @Post('explain-error-stream')
  async streamExplanation(@Req() req: any, @Body() dto: ExplainErrorDto, @Res() response: Response) {
    const userId = getUserId(req, 'Không tìm thấy thông tin định danh người dùng trong Token.');
    return this.sendStream(response, async (signal, send) => {
      const result = await this.ragService.streamExplanation(userId, dto, signal, (chunk) => send({ chunk }));
      send({ result });
    });
  }

  /**
   * 2. Hỏi đáp trợ lý AI Tutor (AI Study Assistant)
   */
  @Post('chat')
  async chatWithTutor(@Req() req: any, @Body() dto: ChatTutorDto) {
    const userId = getUserId(req, 'Không tìm thấy thông tin định danh người dùng trong Token.');
    return this.ragService.chatWithTutor(userId, dto);
  }

  /**
   * Hỏi đáp dạng Server-Sent Events để giao diện hiển thị câu trả lời ngay
   * khi model sinh được từng phần nội dung.
   */
  @Post('chat-stream')
  async streamChatWithTutor(
    @Req() req: any,
    @Body() dto: ChatTutorDto,
    @Res() response: Response,
  ) {
    const userId = getUserId(req, 'Không tìm thấy thông tin định danh người dùng trong Token.');
    return this.sendStream(response, async (signal, send) => {
      for await (const chunk of this.ragService.streamChatWithTutor(userId, dto, signal)) send({ chunk });
    });
  }

  private async sendStream(response: Response, run: (signal: AbortSignal, send: (data: unknown) => void) => Promise<void>) {
    const controller = new AbortController();
    const onClose = () => controller.abort();
    response.on('close', onClose);
    const send = (data: unknown) => {
      if (!controller.signal.aborted) response.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();
    const heartbeat = setInterval(() => {
      if (!controller.signal.aborted) response.write(': keep-alive\n\n');
    }, 10000);

    try {
      await run(controller.signal, send);
      if (!controller.signal.aborted) response.write('data: [DONE]\n\n');
    } catch {
      send({ message: 'Kết nối AI bị gián đoạn. Vui lòng thử lại.' });
    } finally {
      clearInterval(heartbeat);
      response.off('close', onClose);
      controller.abort();
      response.end();
    }
  }

  /**
   * 3. Lấy lịch sử hỏi đáp với AI Tutor
   */
  @Get('chat-history')
  async getChatHistory(@Req() req: any) {
    const userId = getUserId(req, 'Không tìm thấy thông tin định danh người dùng trong Token.');
    return this.ragService.getChatHistory(userId);
  }

  /**
   * 4. Xóa lịch sử hỏi đáp
   */
  @Delete('chat-history')
  async clearChatHistory(@Req() req: any) {
    const userId = getUserId(req, 'Không tìm thấy thông tin định danh người dùng trong Token.');
    return this.ragService.clearChatHistory(userId);
  }

  /**
   * 5. Lộ trình ưu tiên cá nhân hóa (Personalized Priority Roadmap)
   */
  @Get('priority-roadmap')
  async getPersonalizedRoadmap(@Req() req: any) {
    const userId = getUserId(req, 'Không tìm thấy thông tin định danh người dùng trong Token.');
    return this.ragService.getPersonalizedRoadmap(userId);
  }

  /**
   * 6. Tìm kiếm tri thức trong Knowledge Base
   */
  @Get('knowledge/search')
  async searchKnowledge(
    @Query('q') query: string,
    @Query('part') part?: string,
  ) {
    const partNum = part ? parseInt(part, 10) : undefined;
    return this.ragService.searchKnowledge(query || '', partNum);
  }
}
