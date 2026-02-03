export interface MailOptions {
  to: string | string[];
  subject: string;
  template: string;
  context: Record<string, any>;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
  }>;
}

export interface MailJobData extends MailOptions {
  jobId?: string;
  attemptsMade?: number;
}