import { Module } from '@nestjs/common';
import { MasteryService } from './mastery.service';
import { MasteryController } from './mastery.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ActivitiesService } from './activities.service';

@Module({
    imports: [PrismaModule],
    controllers: [MasteryController],
    providers: [MasteryService, ActivitiesService],
    exports: [MasteryService],
})
export class MasteryModule { }
