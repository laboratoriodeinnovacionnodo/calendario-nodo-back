// Este archivo debe estar sincronizado con prisma/schema.prisma
export enum TipoEvento {
  PENDIENTE = 'PENDIENTE',
  EN_CURSO = 'EN_CURSO',
  FINALIZADO = 'FINALIZADO',
  CANCELADO = 'CANCELADO',
  MASIVO = 'MASIVO',
  ESCOLAR = 'ESCOLAR',
}