import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { FilterEventDto } from './dto/filter-event.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { TipoEvento } from '@prisma/client';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async create(createEventDto: CreateEventDto, userId: string) {
    const event = await this.prisma.event.create({
      data: {
        titulo: createEventDto.titulo,
        descripcion: createEventDto.descripcion,
        informacion: createEventDto.informacion,
        fechaDesde: new Date(createEventDto.fechaDesde),
        fechaHasta: new Date(createEventDto.fechaHasta),
        horaDesde: createEventDto.horaDesde,
        horaHasta: createEventDto.horaHasta,
        tipoEvento: createEventDto.tipoEvento as any,
        area: createEventDto.area as any,
        organizadorSolicitante: createEventDto.organizadorSolicitante,
        coberturaPrensaBol: createEventDto.coberturaPrensaBol,
        anexos: createEventDto.anexos || [],
        contactoFormal: createEventDto.contactoFormal,
        contactoInformal: createEventDto.contactoInformal,
        convocatoria: createEventDto.convocatoria,
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

    // 🔥 ENVÍO AUTOMÁTICO DE EMAIL AL CREAR EVENTO
    try {
      await this.mailService.sendEventCreatedEmail(event, event.createdBy);
      this.logger.log(`✉️ Email de confirmación enviado a ${event.createdBy.email}`);
    } catch (error) {
      this.logger.error(`❌ Error enviando email de confirmación: ${error.message}`);
      // No fallar la creación del evento si falla el email
    }

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

    const dataToUpdate: any = {};

    // Solo agregar campos que vienen en el DTO
    if (updateEventDto.titulo !== undefined) dataToUpdate.titulo = updateEventDto.titulo;
    if (updateEventDto.descripcion !== undefined) dataToUpdate.descripcion = updateEventDto.descripcion;
    if (updateEventDto.informacion !== undefined) dataToUpdate.informacion = updateEventDto.informacion;
    if (updateEventDto.horaDesde !== undefined) dataToUpdate.horaDesde = updateEventDto.horaDesde;
    if (updateEventDto.horaHasta !== undefined) dataToUpdate.horaHasta = updateEventDto.horaHasta;
    if (updateEventDto.tipoEvento !== undefined) dataToUpdate.tipoEvento = updateEventDto.tipoEvento;
    if (updateEventDto.area !== undefined) dataToUpdate.area = updateEventDto.area;
    if (updateEventDto.organizadorSolicitante !== undefined) dataToUpdate.organizadorSolicitante = updateEventDto.organizadorSolicitante;
    if (updateEventDto.coberturaPrensaBol !== undefined) dataToUpdate.coberturaPrensaBol = updateEventDto.coberturaPrensaBol;
    if (updateEventDto.contactoFormal !== undefined) dataToUpdate.contactoFormal = updateEventDto.contactoFormal;
    if (updateEventDto.contactoInformal !== undefined) dataToUpdate.contactoInformal = updateEventDto.contactoInformal;
    if (updateEventDto.convocatoria !== undefined) dataToUpdate.convocatoria = updateEventDto.convocatoria;

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
        tipoEvento: TipoEvento.PENDIENTE,
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