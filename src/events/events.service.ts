import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { FilterEventDto } from './dto/filter-event.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createEventDto: CreateEventDto, userId: string) {
    const event = await this.prisma.event.create({
      data: {
        ...createEventDto,
        fechaDesde: new Date(createEventDto.fechaDesde),
        fechaHasta: new Date(createEventDto.fechaHasta),
        anexos: createEventDto.anexos || [],
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true,
          },
        },
      },
    });

    return event;
  }

  async findAll(filterDto?: FilterEventDto) {
    const where: any = {};

    if (filterDto?.fechaDesde && filterDto?.fechaHasta) {
      where.fechaDesde = {
        gte: new Date(filterDto.fechaDesde),
      };
      where.fechaHasta = {
        lte: new Date(filterDto.fechaHasta),
      };
    }

    if (filterDto?.tipoEvento) {
      where.tipoEvento = filterDto.tipoEvento;
    }

    if (filterDto?.area) {
      where.area = filterDto.area;
    }

    return this.prisma.event.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true,
          },
        },
      },
      orderBy: {
        fechaDesde: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto, userId: string, userRole: string) {
    const event = await this.findOne(id);

    if (event.createdById !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('No puedes editar este evento');
    }

    const dataToUpdate: any = { ...updateEventDto };

    if (updateEventDto.fechaDesde) {
      dataToUpdate.fechaDesde = new Date(updateEventDto.fechaDesde);
    }

    if (updateEventDto.fechaHasta) {
      dataToUpdate.fechaHasta = new Date(updateEventDto.fechaHasta);
    }

    if (updateEventDto.anexos !== undefined) {
      dataToUpdate.anexos = updateEventDto.anexos;
    }

    return this.prisma.event.update({
      where: { id },
      data: dataToUpdate,
      include: {
        createdBy: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string, userRole: string) {
    const event = await this.findOne(id);

    if (event.createdById !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('No puedes eliminar este evento');
    }

    return this.prisma.event.delete({
      where: { id },
    });
  }

  async getStatistics() {
    const totalEvents = await this.prisma.event.count();
    
    const eventsByStatus = await this.prisma.event.groupBy({
      by: ['tipoEvento'],
      _count: true,
    });

    const eventsByArea = await this.prisma.event.groupBy({
      by: ['area'],
      _count: true,
    });

    const totalConvocatoria = await this.prisma.event.aggregate({
      _sum: {
        convocatoria: true,
      },
    });

    const upcomingEvents = await this.prisma.event.count({
      where: {
        fechaDesde: {
          gte: new Date(),
        },
        tipoEvento: 'PENDIENTE',
      },
    });

    return {
      totalEvents,
      eventsByStatus,
      eventsByArea,
      totalConvocatoria: totalConvocatoria._sum.convocatoria || 0,
      upcomingEvents,
    };
  }
}