import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { TipoEvento } from '../common/enums/tipo-evento.enum';

@Injectable()
export class EventStatusService {
  private readonly logger = new Logger(EventStatusService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async updateExpiredEvents() {
    this.logger.log('Verificando eventos expirados...');

    const now = new Date();

    try {
      const result = await this.prisma.event.updateMany({
        where: {
          tipoEvento: {
            in: [TipoEvento.PENDIENTE, TipoEvento.EN_CURSO],
          },
          OR: [
            {
              fechaHasta: {
                lt: now,
              },
            },
            {
              AND: [
                {
                  fechaHasta: {
                    lte: now,
                  },
                },
                {
                  horaHasta: {
                    lte: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
                  },
                },
              ],
            },
          ],
        },
        data: {
          tipoEvento: TipoEvento.FINALIZADO,
        },
      });

      if (result.count > 0) {
        this.logger.log(`Se finalizaron \${result.count} evento(s)`);
      }
    } catch (error) {
      this.logger.error('Error al actualizar eventos expirados', error);
    }
  }

  @Cron('*/30 * * * *')
  async updateOngoingEvents() {
    this.logger.log('Verificando eventos en curso...');

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    try {
      const result = await this.prisma.event.updateMany({
        where: {
          tipoEvento: TipoEvento.PENDIENTE,
          fechaDesde: {
            lte: now,
          },
          fechaHasta: {
            gte: now,
          },
          horaDesde: {
            lte: currentTime,
          },
        },
        data: {
          tipoEvento: TipoEvento.EN_CURSO,
        },
      });

      if (result.count > 0) {
        this.logger.log(`Se marcaron \${result.count} evento(s) como en curso`);
      }
    } catch (error) {
      this.logger.error('Error al actualizar eventos en curso', error);
    }
  }
}