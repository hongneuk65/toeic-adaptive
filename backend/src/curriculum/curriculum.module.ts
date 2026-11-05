import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CurriculumService } from './curriculum.service';
import { CurriculumController } from './curriculum.controller';
@Module({imports:[PrismaModule],controllers:[CurriculumController],providers:[CurriculumService]})
export class CurriculumModule {}
