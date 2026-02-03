import { Controller, Get, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { CalendarService } from './calendar.service';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  getCalendar(
    @Query('year', ParseIntPipe) year?: number,
    @Query('month', ParseIntPipe) month?: number,
  ) {
    return this.calendarService.getCalendar(year, month);
  }

  @Get('upcoming')
  getUpcomingEvents(@Query('days', ParseIntPipe) days?: number) {
    return this.calendarService.getUpcomingEvents(days);
  }
}