import { Module, forwardRef } from '@nestjs/common';

import { Das3hService } from './das3h.service';
import { Das3hController } from './das3h.controller';
import { AdaptiveSchedulerService } from './adaptive-scheduler.service';
import { PracticeSupportService } from './practice-support.service';

import { PrismaModule } from '../prisma/prisma.module';
import { MasteryQueueModule } from '../queue/mastery-queue.module';

@Module({
    imports: [
        PrismaModule,
        forwardRef(() => MasteryQueueModule),
    ],
    controllers: [
        Das3hController,
    ],
    providers: [
        PracticeSupportService,
        Das3hService,
        AdaptiveSchedulerService,
    ],
    exports: [
        Das3hService,
        AdaptiveSchedulerService,
    ],
})
export class Das3hModule { }
