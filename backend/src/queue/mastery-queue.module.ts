import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { MasteryQueueService } from './mastery-queue.service';
import { MasteryOutboxService } from './mastery-outbox.service';
import { MasteryProcessor } from './mastery.processor';

import { Das3hModule } from '../das3h/das3h.module';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'mastery-queue',
        }),
        forwardRef(() => Das3hModule),
    ],
    providers: [
        MasteryQueueService,
        MasteryProcessor,
        MasteryOutboxService,
    ],
    exports: [
        BullModule,
        MasteryQueueService,
    ],
})
export class MasteryQueueModule { }
