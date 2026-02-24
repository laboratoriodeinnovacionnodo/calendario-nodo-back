-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('PENDIENTE', 'EN_CURSO', 'FINALIZADO', 'CANCELADO', 'MASIVO', 'ESCOLAR');

-- CreateEnum
CREATE TYPE "Area" AS ENUM (
  'COWORKING',
  'AUDITORIO',
  'LABORATORIO',
  'AULA_1',
  'AULA_2',
  'AULA_3',
  'AULA_4',
  'AULA_5',
  'AULA_6',
  'RECEPCION_ESTE',
  'RECEPCION_OESTE',
  'EXPLANADA',
  'PLAZA',
  'SALA_REUNIONES'
);

-- CreateTable
CREATE TABLE "users" (
    "id"        TEXT        NOT NULL,
    "nombre"    TEXT        NOT NULL,
    "email"     TEXT        NOT NULL,
    "password"  TEXT        NOT NULL,
    "rol"       "Role"      NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id"                     TEXT          NOT NULL,
    "titulo"                 TEXT          NOT NULL,
    "descripcion"            TEXT,
    "informacion"            TEXT          NOT NULL,
    "fechaDesde"             TIMESTAMP(3) NOT NULL,
    "fechaHasta"             TIMESTAMP(3) NOT NULL,
    "horaDesde"              TEXT          NOT NULL,
    "horaHasta"              TEXT          NOT NULL,
    "tipoEvento"             "TipoEvento"  NOT NULL DEFAULT 'PENDIENTE',
    "areas"                  "Area"[]      NOT NULL DEFAULT ARRAY[]::"Area"[],
    "organizadorSolicitante" TEXT          NOT NULL,
    "coberturaPrensaBol"     BOOLEAN       NOT NULL DEFAULT false,
    "anexos"                 TEXT[]        NOT NULL DEFAULT ARRAY[]::TEXT[],
    "contactoFormal"         TEXT          NOT NULL,
    "contactoInformal"       TEXT,
    "convocatoria"           INTEGER       NOT NULL DEFAULT 0,
    "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"              TIMESTAMP(3) NOT NULL,
    "createdById"            TEXT          NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "events_fechaDesde_fechaHasta_idx" ON "events"("fechaDesde", "fechaHasta");

-- CreateIndex
CREATE INDEX "events_tipoEvento_idx" ON "events"("tipoEvento");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;