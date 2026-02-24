import { IsDateString, IsEnum, IsOptional, IsArray, ArrayMinSize } from 'class-validator';
import { TipoEvento } from '../../common/enums/tipo-evento.enum';
import { Area } from '../../common/enums/area.enum';

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

  // Filtrar por área específica (un área a la vez en query param)
  @IsEnum(Area)
  @IsOptional()
  area?: Area;
}