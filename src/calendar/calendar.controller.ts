import { Controller, Get, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/roles.enum';

@Controller('calendar')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  @Roles(Role.ADMIN, Role.VEEDOR)
  getCalendar(
    @Query('year', ParseIntPipe) year?: number,
    @Query('month', ParseIntPipe) month?: number,
  ) {
    return this.calendarService.getCalendar(year, month);
  }

  @Get('upcoming')
  @Roles(Role.ADMIN, Role.VEEDOR)
  getUpcomingEvents(@Query('days', ParseIntPipe) days?: number) {
    return this.calendarService.getUpcomingEvents(days);
  }
}