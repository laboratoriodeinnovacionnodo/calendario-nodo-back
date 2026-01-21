import { IsDateString, IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { TipoEvento } from '../../common/enums/tipo-evento.enum';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

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
}
