import { IsEmail, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class SendMailDto {
  @IsEmail({}, { each: true })
  @IsNotEmpty()
  to: string | string[];

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  template: string;

  @IsObject()
  @IsNotEmpty()
  context: Record<string, any>;

  @IsEmail()
  @IsOptional()
  from?: string;

  @IsEmail({}, { each: true })
  @IsOptional()
  cc?: string | string[];

  @IsEmail({}, { each: true })
  @IsOptional()
  bcc?: string | string[];
}