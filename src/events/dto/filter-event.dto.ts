import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { TipoEvento } from '../../common/enums/tipo-evento.enum';

export class FilterEventDto {
  @IsDateString()
  @IsOptional()
  fechaDesde?: string;

  @IsDateString()
  @IsOptional()
  fechaHasta?: string;

  @IsEnum(TipoEvento)
  @IsOptional()
  tipoEvento?: TipoEvento;
}