import { 
  IsDateString, 
  IsEnum, 
  IsOptional, 
  IsString, 
  Matches, 
  IsBoolean, 
  IsArray, 
  IsUrl, 
  IsInt, 
  Min,
  ArrayMinSize,
  ArrayUnique,
} from 'class-validator';
import { TipoEvento } from '../../common/enums/tipo-evento.enum';
import { Area } from '../../common/enums/area.enum';
import { Type } from 'class-transformer';

export class UpdateEventDto {
  @IsString()
  @IsOptional()
  titulo?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  informacion?: string;

  @IsDateString()
  @IsOptional()
  fechaDesde?: string;

  @IsDateString()
  @IsOptional()
  fechaHasta?: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'horaDesde debe tener formato HH:mm',
  })
  @IsOptional()
  horaDesde?: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'horaHasta debe tener formato HH:mm',
  })
  @IsOptional()
  horaHasta?: string;

  @IsEnum(TipoEvento)
  @IsOptional()
  tipoEvento?: TipoEvento;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe seleccionar al menos un área' })
  @ArrayUnique({ message: 'No puede haber áreas duplicadas' })
  @IsEnum(Area, { each: true, message: 'Cada área debe ser un valor válido' })
  @IsOptional()
  areas?: Area[];

  @IsString()
  @IsOptional()
  organizadorSolicitante?: string;

  @IsBoolean()
  @IsOptional()
  coberturaPrensaBol?: boolean;

  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  anexos?: string[];

  @IsString()
  @IsOptional()
  contactoFormal?: string;

  @IsString()
  @IsOptional()
  contactoInformal?: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  convocatoria?: number;
}