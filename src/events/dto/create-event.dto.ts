import { 
  IsDateString, 
  IsEnum, 
  IsNotEmpty, 
  IsString, 
  Matches, 
  IsOptional, 
  IsBoolean, 
  IsArray, 
  IsUrl, 
  IsInt, 
  Min 
} from 'class-validator';
import { TipoEvento } from '../../common/enums/tipo-evento.enum';
import { Area } from '../../common/enums/area.enum';
import { Type } from 'class-transformer';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsNotEmpty()
  informacion: string;

  @IsDateString()
  fechaDesde: string;

  @IsDateString()
  fechaHasta: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'horaDesde debe tener formato HH:mm',
  })
  horaDesde: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'horaHasta debe tener formato HH:mm',
  })
  horaHasta: string;

  @IsEnum(TipoEvento)
  tipoEvento: TipoEvento;

  @IsEnum(Area)
  @IsNotEmpty()
  area: Area;

  @IsString()
  @IsNotEmpty()
  organizadorSolicitante: string;

  @IsBoolean()
  coberturaPrensaBol: boolean;

  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  anexos?: string[];

  @IsString()
  @IsNotEmpty()
  contactoFormal: string;

  @IsString()
  @IsOptional()
  contactoInformal?: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  convocatoria: number;
}