import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { ListeningController, ListeningAdminController, ListeningMediaController } from './listening.controller';
import { ListeningService } from './listening.service';
import { TranscriptProvider, YoutubeTranscriptProvider } from './transcript.provider';
import { TranscriptProcessor } from './transcript.processor';
import { LocalAsrProvider } from './local-asr.provider';

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: 'listening-transcript' })],
  controllers: [ListeningController, ListeningAdminController, ListeningMediaController],
  providers: [ListeningService, TranscriptProcessor, LocalAsrProvider, { provide: TranscriptProvider, useClass: YoutubeTranscriptProvider }],
})
export class ListeningModule {}
