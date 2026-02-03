import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { FilterEventDto } from './dto/filter-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/roles.enum';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createEventDto: CreateEventDto, @GetUser() user: any) {
    return this.eventsService.create(createEventDto, user.id);
  }

  @Get()
  @Roles(Role.ADMIN)
  findAll(@Query() filterDto: FilterEventDto) {
    return this.eventsService.findAll(filterDto);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto, @GetUser() user: any) {
    return this.eventsService.update(id, updateEventDto, user.id, user.rol);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @GetUser() user: any) {
    return this.eventsService.remove(id, user.id, user.rol);
  }
}