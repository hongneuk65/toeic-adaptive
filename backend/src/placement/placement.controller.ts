import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { getUserId } from '../common/user-id';
import { PlacementPreferencesDto, SubmitPlacementDto } from './placement.dto';
import { PlacementService } from './placement.service';

@Controller('placement')
@Roles(Role.USER)
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PlacementController {
  constructor(private readonly service: PlacementService) {}
  @Get('overview') overview(@Request() req: any) {
    return this.service.overview(getUserId(req));
  }
  @Patch('preferences') preferences(
    @Request() req: any,
    @Body() dto: PlacementPreferencesDto,
  ) {
    return this.service.savePreferences(getUserId(req), dto);
  }
  @Post('start') start(
    @Request() req: any,
    @Body() dto: PlacementPreferencesDto,
  ) {
    return this.service.start(getUserId(req), dto);
  }
  @Get(':id') get(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.get(getUserId(req), id);
  }
  @Post(':id/answer') answer(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitPlacementDto,
  ) {
    return this.service.answer(getUserId(req), id, dto);
  }
}
