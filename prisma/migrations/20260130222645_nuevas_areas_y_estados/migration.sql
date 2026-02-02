/*
  Warnings:

  - Added the required column `area` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contactoFormal` to the `events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizadorSolicitante` to the `events` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Area" AS ENUM ('COWORKING', 'AUDITORIO', 'LABORATORIO', 'AULA');

-- AlterEnum
ALTER TYPE "TipoEvento" ADD VALUE 'CANCELADO';

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "anexos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "area" "Area" NOT NULL,
ADD COLUMN     "coberturaPrensaBol" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contactoFormal" TEXT NOT NULL,
ADD COLUMN     "contactoInformal" TEXT,
ADD COLUMN     "convocatoria" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "organizadorSolicitante" TEXT NOT NULL,
ALTER COLUMN "descripcion" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "events_area_idx" ON "events"("area");
