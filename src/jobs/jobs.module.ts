import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventStatusService } from '../events/event-status.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [EventStatusService],
  exports: [EventStatusService],
})
export class JobsModule {}