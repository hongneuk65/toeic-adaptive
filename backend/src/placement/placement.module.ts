import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlacementController } from './placement.controller';
import { PlacementService } from './placement.service';
@Module({
  imports: [PrismaModule],
  controllers: [PlacementController],
  providers: [PlacementService],
})
export class PlacementModule {}
