import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async getCalendar(year?: number, month?: number) {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month !== undefined ? month : now.getMonth() + 1;

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const events = await this.prisma.event.findMany({
      where: {
        OR: [
          {
            fechaDesde: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            fechaHasta: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            AND: [
              {
                fechaDesde: {
                  lte: startDate,
                },
              },
              {
                fechaHasta: {
                  gte: endDate,
                },
              },
            ],
          },
        ],
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
      orderBy: {
        fechaDesde: 'asc',
      },
    });

    return {
      year: targetYear,
      month: targetMonth,
      startDate,
      endDate,
      events,
      totalEvents: events.length,
    };
  }

  async getUpcomingEvents(days: number = 7) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const events = await this.prisma.event.findMany({
      where: {
        fechaDesde: {
          gte: now,
          lte: futureDate,
        },
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
      orderBy: {
        fechaDesde: 'asc',
      },
    });

    return {
      startDate: now,
      endDate: futureDate,
      days,
      events,
      totalEvents: events.length,
    };
  }
}