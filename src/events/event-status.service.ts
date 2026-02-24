import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { TipoEvento } from '../common/enums/tipo-evento.enum';

@Injectable()
export class EventStatusService {
  private readonly logger = new Logger(EventStatusService.name);
  private isProcessing = false;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Convierte una cadena de hora "HH:mm" a minutos desde medianoche.
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Se ejecuta cada 15 minutos.
   * Finaliza eventos cuya fecha Y hora de fin (horaHasta) ya hayan pasado.
   * NO modifica eventos FINALIZADOS ni CANCELADOS.
   * SÍ modifica PENDIENTE, EN_CURSO, MASIVO y ESCOLAR.
   */
  @Cron('*/30 * * * *')
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

      // Traer candidatos: todos los estados EXCEPTO FINALIZADO y CANCELADO
      // Incluye: PENDIENTE, EN_CURSO, MASIVO, ESCOLAR
      const candidates = await this.prisma.event.findMany({
        where: {
          tipoEvento: {
            notIn: [
              TipoEvento.FINALIZADO as any,
              TipoEvento.CANCELADO as any,
            ],
          },
          // Solo eventos cuya fecha de fin es hoy o anterior
          fechaHasta: {
            lte: now,
          },
        },
        select: {
          id: true,
          titulo: true,
          fechaHasta: true,
          horaHasta: true,
          tipoEvento: true,
        },
      });

      if (candidates.length === 0) {
        this.logger.log('✅ No hay eventos candidatos para finalizar');
        return;
      }

      // Filtrar: solo finalizar los que ya superaron su horaHasta
      // Como el cron corre cada 15 min, si horaHasta es 17:17,
      // recién se finalizará a las 17:30 cuando el cron vuelva a correr
      const nowHours = now.getHours();
      const nowMinutes = now.getMinutes();
      const nowTotalMinutes = nowHours * 60 + nowMinutes;

      const expiredEventIds: string[] = [];

      for (const event of candidates) {
        const fechaHasta = new Date(event.fechaHasta);

        const fechaHastaSinHora = new Date(fechaHasta);
        fechaHastaSinHora.setHours(0, 0, 0, 0);

        const hoySinHora = new Date(now);
        hoySinHora.setHours(0, 0, 0, 0);

        // Si fechaHasta es un día anterior a hoy → definitivamente expirado
        if (fechaHastaSinHora < hoySinHora) {
          expiredEventIds.push(event.id);
          this.logger.debug(
            `   ↳ "${event.titulo}" [${event.tipoEvento}] expirado (fecha anterior: ${fechaHasta.toDateString()})`,
          );
          continue;
        }

        // Si fechaHasta es hoy → verificar que la hora actual ya superó horaHasta
        // Ejemplo: horaHasta = 17:17, cron de las 17:30 → 17:30 >= 17:17 ✅ → finaliza
        if (fechaHastaSinHora.getTime() === hoySinHora.getTime()) {
          const eventEndMinutes = this.timeToMinutes(event.horaHasta);
          if (nowTotalMinutes >= eventEndMinutes) {
            expiredEventIds.push(event.id);
            this.logger.debug(
              `   ↳ "${event.titulo}" [${event.tipoEvento}] expirado (hoy, hora fin: ${event.horaHasta}, ahora: ${nowHours}:${String(nowMinutes).padStart(2, '0')})`,
            );
          } else {
            this.logger.debug(
              `   ↳ "${event.titulo}" [${event.tipoEvento}] todavía activo (hora fin: ${event.horaHasta}, faltan ${eventEndMinutes - nowTotalMinutes} min)`,
            );
          }
        }
      }

      if (expiredEventIds.length === 0) {
        this.logger.log('✅ Ningún evento alcanzó su horaHasta aún');
        return;
      }

      // Actualizar en batch
      const result = await this.prisma.event.updateMany({
        where: {
          id: { in: expiredEventIds },
        },
        data: {
          tipoEvento: TipoEvento.FINALIZADO as any,
          updatedAt: now,
        },
      });

      const duration = Date.now() - startTime;
      this.logger.log(`✅ ${result.count} evento(s) finalizados en ${duration}ms`);
    } catch (error) {
      this.logger.error('❌ Error al actualizar eventos expirados:', error.message);
      this.logger.error(error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Se ejecuta cada 15 minutos para marcar eventos que ya iniciaron como EN_CURSO.
   * Verifica también que la horaDesde ya haya pasado.
   * Solo aplica a PENDIENTE (MASIVO y ESCOLAR manejan su propio flujo si aplica).
   */
  @Cron('*/15 * * * *')
  async updateOngoingEvents() {
    try {
      this.logger.log('🔍 Verificando eventos en curso...');

      const now = new Date();
      const nowTotalMinutes = now.getHours() * 60 + now.getMinutes();

      // Buscar eventos PENDIENTES cuya fechaDesde es hoy o anterior
      // y cuya fechaHasta es hoy o posterior
      const candidates = await this.prisma.event.findMany({
        where: {
          tipoEvento: TipoEvento.PENDIENTE as any,
          fechaDesde: { lte: now },
          fechaHasta: { gte: now },
        },
        select: {
          id: true,
          titulo: true,
          fechaDesde: true,
          horaDesde: true,
        },
      });

      if (candidates.length === 0) {
        this.logger.log('✅ No hay eventos para marcar como EN_CURSO');
        return;
      }

      const ongoingIds: string[] = [];

      for (const event of candidates) {
        const fechaDesde = new Date(event.fechaDesde);
        const fechaDesdeDate = new Date(fechaDesde);
        fechaDesdeDate.setHours(0, 0, 0, 0);

        const hoyDate = new Date(now);
        hoyDate.setHours(0, 0, 0, 0);

        if (fechaDesdeDate < hoyDate) {
          // Empezó en un día anterior → ya está en curso
          ongoingIds.push(event.id);
        } else if (fechaDesdeDate.getTime() === hoyDate.getTime()) {
          // Empieza hoy → verificar si ya pasó la horaDesde
          const eventStartMinutes = this.timeToMinutes(event.horaDesde);
          if (nowTotalMinutes >= eventStartMinutes) {
            ongoingIds.push(event.id);
          }
        }
      }

      if (ongoingIds.length === 0) {
        this.logger.log('✅ Ningún evento alcanzó su horaDesde aún');
        return;
      }

      const result = await this.prisma.event.updateMany({
        where: { id: { in: ongoingIds } },
        data: {
          tipoEvento: TipoEvento.EN_CURSO as any,
          updatedAt: now,
        },
      });

      this.logger.log(`✅ ${result.count} evento(s) marcados como EN_CURSO`);

      ongoingIds.forEach((id) => {
        const event = candidates.find((e) => e.id === id);
        if (event) this.logger.debug(`   ↳ "${event.titulo}" ahora está en curso`);
      });
    } catch (error) {
      this.logger.error('❌ Error al actualizar eventos en curso:', error.message);
    }
  }

  /**
   * Recordatorios automáticos: se ejecuta todos los días a las 9 AM
   */
  @Cron('0 9 * * *')
  async sendEventReminders() {
    try {
      this.logger.log('📧 Verificando recordatorios de eventos...');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const endOfTomorrow = new Date(tomorrow);
      endOfTomorrow.setHours(23, 59, 59, 999);

      const upcomingEvents = await this.prisma.event.findMany({
        where: {
          fechaDesde: {
            gte: tomorrow,
            lte: endOfTomorrow,
          },
          tipoEvento: {
            in: [TipoEvento.PENDIENTE as any],
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

      this.logger.log(`📬 ${upcomingEvents.length} recordatorios pendientes`);
      // Aquí integrarías con MailService si lo deseas
    } catch (error) {
      this.logger.error('❌ Error enviando recordatorios:', error.message);
    }
  }

  /**
   * Forzar actualización manual (útil para debugging o endpoint admin)
   */
  async forceUpdateAllStatuses() {
    this.logger.log('🔧 Forzando actualización manual de estados...');
    await this.updateExpiredEvents();
    await this.updateOngoingEvents();
  }

  async getEventStatusStats() {
    const stats = await this.prisma.event.groupBy({
      by: ['tipoEvento'],
      _count: { id: true },
    });

    return stats.reduce((acc, stat) => {
      acc[stat.tipoEvento] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);
  }
}