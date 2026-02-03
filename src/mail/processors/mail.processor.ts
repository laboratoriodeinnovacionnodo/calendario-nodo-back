import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { MailService } from '../mail.service';
import { MailJobData } from '../interfaces/mail-options.interface';

@Processor('mail')
export class MailProcessor {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailService: MailService) {}

  @Process('send-email')
  async handleSendEmail(job: Job<MailJobData>) {
    const { id, attemptsMade, data } = job;

    this.logger.log(`🔄 Procesando job ${id} - Intento ${attemptsMade + 1}`);

    try {
      await this.mailService.sendMail(data);
      
      this.logger.log(`✅ Job ${id} completado exitosamente`);
      
      return {
        success: true,
        jobId: id,
        sentAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`❌ Job ${id} falló: ${error.message}`);
      
      if (attemptsMade < 2) {
        this.logger.log(`🔁 Se reintentará automáticamente...`);
      } else {
        this.logger.error(`⛔ Job ${id} alcanzó máximo de reintentos`);
        
        // Aquí podrías guardar en DB para revisión manual
        await this.logFailedEmail(job);
      }
      
      throw error;
    }
  }

  private async logFailedEmail(job: Job<MailJobData>) {
    // Guardar en DB o servicio de monitoreo
    this.logger.error(
      `Failed email job: ${JSON.stringify({
        jobId: job.id,
        data: job.data,
        attempts: job.attemptsMade,
        timestamp: new Date().toISOString(),
      })}`,
    );
  }
}