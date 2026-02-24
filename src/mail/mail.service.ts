import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { MailOptions, MailJobData } from './interfaces/mail-options.interface';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;

  constructor(
    private readonly configService: ConfigService,
    @InjectQueue('mail') private readonly mailQueue: Queue<MailJobData>,
  ) {
    this.createTransporter();
  }

  private createTransporter() {
    const host = this.configService.get<string>('MAIL_HOST');
    const port = this.configService.get<number>('MAIL_PORT');
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASS');

    if (!host || !port || !user || !pass) {
      this.logger.warn('Configuración de email incompleta. Emails deshabilitados.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });

    this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.logger.log('✅ Conexión SMTP verificada correctamente');
    } catch (error) {
      this.logger.error('❌ Error al verificar conexión SMTP:', error.message);
    }
  }

  async sendMail(options: MailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn('Transporter no configurado. Email no enviado.');
      return false;
    }

    try {
      const html = await this.loadTemplate(options.template, options.context);

      const mailOptions = {
        from: options.from || this.configService.get<string>('MAIL_FROM'),
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`✉️ Email enviado: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error enviando email: ${error.message}`);
      throw error;
    }
  }

  async queueEmail(options: MailOptions, priority: number = 0): Promise<void> {
    try {
      const job = await this.mailQueue.add('send-email', options, {
        priority,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      });

      this.logger.log(`📬 Email encolado con ID: ${job.id}`);
    } catch (error) {
      this.logger.error(`❌ Error encolando email: ${error.message}`);
      throw error;
    }
  }

  private async loadTemplate(templateName: string, context: Record<string, any>): Promise<string> {
    const templatePath = path.join(__dirname, 'templates', `${templateName}.html`);

    try {
      let template = await fs.readFile(templatePath, 'utf-8');

      Object.keys(context).forEach((key) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        template = template.replace(regex, context[key]);
      });

      return template;
    } catch (error) {
      this.logger.error(`❌ Error cargando template ${templateName}: ${error.message}`);
      throw new Error(`Template ${templateName} no encontrado`);
    }
  }

  // ✅ ACTUALIZADO: areas es array, se muestra como lista separada por comas
  async sendEventCreatedEmail(event: any, creator: any): Promise<void> {
    await this.queueEmail({
      to: creator.email,
      subject: `Evento creado: ${event.titulo}`,
      template: 'event-created',
      context: {
        userName: creator.nombre,
        eventTitle: event.titulo,
        eventDate: new Date(event.fechaDesde).toLocaleDateString('es-AR'),
        eventTime: event.horaDesde,
        eventArea: Array.isArray(event.areas) ? event.areas.join(', ') : event.areas,
      },
    });
  }

  async sendEventReminderEmail(event: any, recipients: string[]): Promise<void> {
    await this.queueEmail(
      {
        to: recipients,
        subject: `Recordatorio: ${event.titulo} - Mañana`,
        template: 'event-reminder',
        context: {
          eventTitle: event.titulo,
          eventDate: new Date(event.fechaDesde).toLocaleDateString('es-AR'),
          eventTime: event.horaDesde,
          eventLocation: Array.isArray(event.areas) ? event.areas.join(', ') : event.areas,
          eventDescription: event.descripcion,
        },
      },
      1,
    );
  }

  async sendBulkEmails(recipients: string[], options: Omit<MailOptions, 'to'>): Promise<void> {
    const chunks = this.chunkArray(recipients, 50);

    for (const chunk of chunks) {
      await this.queueEmail({ ...options, to: chunk });
    }

    this.logger.log(`📧 ${recipients.length} emails encolados en ${chunks.length} lotes`);
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}