import { Injectable, NotFoundException, ForbiddenException, ConflictException, Logger } from '@nestjs/common';
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

  /**
   * Verifica si hay solapamiento horario entre dos eventos.
   * Dos eventos se solapan si sus rangos de fecha/hora se intersectan.
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Verifica si las áreas solicitadas están disponibles en el rango de fechas y horas dado.
   * Excluye opcionalmente un evento (útil en updates).
   */
  async checkAreaAvailability(
    areas: string[],
    fechaDesde: Date,
    fechaHasta: Date,
    horaDesde: string,
    horaHasta: string,
    excludeEventId?: string,
  ): Promise<void> {
    const horaDesdeMin = this.timeToMinutes(horaDesde);
    const horaHastaMin = this.timeToMinutes(horaHasta);

    // Buscar eventos que se solapen en fechas
    const conflictingEvents = await this.prisma.event.findMany({
      where: {
        id: excludeEventId ? { not: excludeEventId } : undefined,
        tipoEvento: {
          notIn: [TipoEvento.CANCELADO, TipoEvento.FINALIZADO],
        },
        // Solapamiento de fechas: el evento existente no termina antes de que empiece el nuevo,
        // y no empieza después de que termine el nuevo
        AND: [
          { fechaDesde: { lte: fechaHasta } },
          { fechaHasta: { gte: fechaDesde } },
        ],
      },
      select: {
        id: true,
        titulo: true,
        areas: true,
        horaDesde: true,
        horaHasta: true,
        fechaDesde: true,
        fechaHasta: true,
      },
    });

    // Verificar solapamiento de horario para eventos con áreas en común
    const occupiedAreas: string[] = [];

    for (const event of conflictingEvents) {
      // Verificar si hay áreas en común
      const sharedAreas = event.areas.filter((a) => areas.includes(a as string));
      if (sharedAreas.length === 0) continue;

      // Verificar si las horas se solapan
      const existingDesdeMin = this.timeToMinutes(event.horaDesde);
      const existingHastaMin = this.timeToMinutes(event.horaHasta);

      // Solapamiento: nuevo empieza antes de que termine el existente Y
      //               nuevo termina después de que empiece el existente
      const horasSeSuperponen =
        horaDesdeMin < existingHastaMin && horaHastaMin > existingDesdeMin;

      if (horasSeSuperponen) {
        occupiedAreas.push(...sharedAreas.map((a) => `${a} (ocupada por: "${event.titulo}")`));
      }
    }

    if (occupiedAreas.length > 0) {
      throw new ConflictException(
        `Las siguientes áreas no están disponibles en ese horario: ${occupiedAreas.join(', ')}`,
      );
    }
  }

  async create(createEventDto: CreateEventDto, userId: string) {
    const fechaDesde = new Date(createEventDto.fechaDesde);
    const fechaHasta = new Date(createEventDto.fechaHasta);

    // ✅ Verificar disponibilidad de áreas antes de crear
    await this.checkAreaAvailability(
      createEventDto.areas as string[],
      fechaDesde,
      fechaHasta,
      createEventDto.horaDesde,
      createEventDto.horaHasta,
    );

    const event = await this.prisma.event.create({
      data: {
        titulo: createEventDto.titulo,
        descripcion: createEventDto.descripcion,
        informacion: createEventDto.informacion,
        fechaDesde,
        fechaHasta,
        horaDesde: createEventDto.horaDesde,
        horaHasta: createEventDto.horaHasta,
        tipoEvento: createEventDto.tipoEvento as any,
        areas: createEventDto.areas as any,
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

    // Filtrar eventos que contengan el área específica en su array
    if (filterDto?.area) {
      where.areas = {
        has: filterDto.area,
      };
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

    // Si se actualizan áreas o fechas/horas, verificar disponibilidad
    const newAreas = updateEventDto.areas ?? (event.areas as string[]);
    const newFechaDesde = updateEventDto.fechaDesde ? new Date(updateEventDto.fechaDesde) : event.fechaDesde;
    const newFechaHasta = updateEventDto.fechaHasta ? new Date(updateEventDto.fechaHasta) : event.fechaHasta;
    const newHoraDesde = updateEventDto.horaDesde ?? event.horaDesde;
    const newHoraHasta = updateEventDto.horaHasta ?? event.horaHasta;

    const needsAvailabilityCheck =
      updateEventDto.areas !== undefined ||
      updateEventDto.fechaDesde !== undefined ||
      updateEventDto.fechaHasta !== undefined ||
      updateEventDto.horaDesde !== undefined ||
      updateEventDto.horaHasta !== undefined;

    if (needsAvailabilityCheck) {
      await this.checkAreaAvailability(
        newAreas,
        newFechaDesde,
        newFechaHasta,
        newHoraDesde,
        newHoraHasta,
        id, // excluir el evento actual
      );
    }

    const dataToUpdate: any = {};

    if (updateEventDto.titulo !== undefined) dataToUpdate.titulo = updateEventDto.titulo;
    if (updateEventDto.descripcion !== undefined) dataToUpdate.descripcion = updateEventDto.descripcion;
    if (updateEventDto.informacion !== undefined) dataToUpdate.informacion = updateEventDto.informacion;
    if (updateEventDto.horaDesde !== undefined) dataToUpdate.horaDesde = updateEventDto.horaDesde;
    if (updateEventDto.horaHasta !== undefined) dataToUpdate.horaHasta = updateEventDto.horaHasta;
    if (updateEventDto.tipoEvento !== undefined) dataToUpdate.tipoEvento = updateEventDto.tipoEvento;
    if (updateEventDto.areas !== undefined) dataToUpdate.areas = updateEventDto.areas;
    if (updateEventDto.organizadorSolicitante !== undefined) dataToUpdate.organizadorSolicitante = updateEventDto.organizadorSolicitante;
    if (updateEventDto.coberturaPrensaBol !== undefined) dataToUpdate.coberturaPrensaBol = updateEventDto.coberturaPrensaBol;
    if (updateEventDto.contactoFormal !== undefined) dataToUpdate.contactoFormal = updateEventDto.contactoFormal;
    if (updateEventDto.contactoInformal !== undefined) dataToUpdate.contactoInformal = updateEventDto.contactoInformal;
    if (updateEventDto.convocatoria !== undefined) dataToUpdate.convocatoria = updateEventDto.convocatoria;

    if (updateEventDto.fechaDesde) dataToUpdate.fechaDesde = new Date(updateEventDto.fechaDesde);
    if (updateEventDto.fechaHasta) dataToUpdate.fechaHasta = new Date(updateEventDto.fechaHasta);
    if (updateEventDto.anexos !== undefined) dataToUpdate.anexos = updateEventDto.anexos;

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
      totalConvocatoria: totalConvocatoria._sum.convocatoria || 0,
      upcomingEvents,
    };
  }
}