import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { TipoEvento } from '../common/enums/tipo-evento.enum';

@Injectable()
export class EventStatusService {
  private readonly logger = new Logger(EventStatusService.name);
  private isProcessing = false;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Se ejecuta cada hora para finalizar eventos que ya pasaron
   * NO modifica eventos CANCELADOS
   */
  @Cron(CronExpression.EVERY_HOUR)
  async updateExpiredEvents() {
    if (this.isProcessing) {
      this.logger.warn('⏸️ Ya hay un proceso en ejecución, saltando...');
      return;
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      this.logger.log('🔍 Verificando eventos expirados...');

      const now = new Date();

      // Buscar eventos que ya finalizaron pero no están marcados como tal
      const expiredEvents = await this.prisma.event.findMany({
        where: {
          tipoEvento: {
            in: [TipoEvento.PENDIENTE, TipoEvento.EN_CURSO],
            not: TipoEvento.CANCELADO, // EXCEPCIÓN: No modificar cancelados
          },
          fechaHasta: {
            lt: now,
          },
        },
        select: {
          id: true,
          titulo: true,
          fechaHasta: true,
          tipoEvento: true,
        },
      });

      if (expiredEvents.length === 0) {
        this.logger.log('✅ No hay eventos para finalizar');
        return;
      }

      // Actualizar en batch
      const result = await this.prisma.event.updateMany({
        where: {
          id: {
            in: expiredEvents.map((e) => e.id),
          },
        },
        data: {
          tipoEvento: TipoEvento.FINALIZADO,
          updatedAt: now,
        },
      });

      const duration = Date.now() - startTime;

      this.logger.log(
        `✅ ${result.count} evento(s) finalizados en ${duration}ms`,
      );

      // Log detallado de cada evento actualizado
      expiredEvents.forEach((event) => {
        this.logger.debug(
          `   ↳ "${event.titulo}" (${event.tipoEvento} → FINALIZADO)`,
        );
      });
    } catch (error) {
      this.logger.error('❌ Error al actualizar eventos expirados:', error.message);
      this.logger.error(error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Se ejecuta cada 30 minutos para marcar eventos que ya iniciaron
   */
  @Cron('*/30 * * * *')
  async updateOngoingEvents() {
    try {
      this.logger.log('🔍 Verificando eventos en curso...');

      const now = new Date();

      // Comparación de fecha completa (sin usar horaDesde por simplicidad)
      const ongoingEvents = await this.prisma.event.findMany({
        where: {
          tipoEvento: TipoEvento.PENDIENTE,
          fechaDesde: {
            lte: now,
          },
          fechaHasta: {
            gte: now,
          },
        },
        select: {
          id: true,
          titulo: true,
          fechaDesde: true,
        },
      });

      if (ongoingEvents.length === 0) {
        this.logger.log('✅ No hay eventos para marcar como EN_CURSO');
        return;
      }

      const result = await this.prisma.event.updateMany({
        where: {
          id: {
            in: ongoingEvents.map((e) => e.id),
          },
        },
        data: {
          tipoEvento: TipoEvento.EN_CURSO,
          updatedAt: now,
        },
      });

      this.logger.log(`✅ ${result.count} evento(s) marcados como EN_CURSO`);

      ongoingEvents.forEach((event) => {
        this.logger.debug(`   ↳ "${event.titulo}" ahora está en curso`);
      });
    } catch (error) {
      this.logger.error('❌ Error al actualizar eventos en curso:', error.message);
    }
  }

  /**
   * Tarea opcional: Recordatorios automáticos
   * Se ejecuta todos los días a las 9 AM
   */
  @Cron('0 9 * * *')
  async sendEventReminders() {
    try {
      this.logger.log('📧 Enviando recordatorios de eventos...');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const endOfTomorrow = new Date(tomorrow);
      endOfTomorrow.setHours(23, 59, 59, 999);

      // Eventos que son mañana
      const upcomingEvents = await this.prisma.event.findMany({
        where: {
          fechaDesde: {
            gte: tomorrow,
            lte: endOfTomorrow,
          },
          tipoEvento: {
            in: [TipoEvento.PENDIENTE],
          },
        },
        include: {
          createdBy: {
            select: {
              email: true,
              nombre: true,
            },
          },
        },
      });

      this.logger.log(`📬 ${upcomingEvents.length} recordatorios a enviar`);

      // Aquí integrarías con MailService
      // for (const event of upcomingEvents) {
      //   await this.mailService.sendEventReminderEmail(event, [event.createdBy.email]);
      // }
    } catch (error) {
      this.logger.error('❌ Error enviando recordatorios:', error.message);
    }
  }

  /**
   * Método manual para forzar actualización (útil para debugging)
   */
  async forceUpdateAllStatuses() {
    this.logger.log('🔧 Forzando actualización manual de estados...');
    await this.updateExpiredEvents();
    await this.updateOngoingEvents();
  }

  /**
   * Obtener estadísticas de eventos por estado
   */
  async getEventStatusStats() {
    const stats = await this.prisma.event.groupBy({
      by: ['tipoEvento'],
      _count: {
        id: true,
      },
    });

    return stats.reduce((acc, stat) => {
      acc[stat.tipoEvento] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);
  }
}