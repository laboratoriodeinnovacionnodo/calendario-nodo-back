/*
  Warnings:

  - The values [AULA] on the enum `Area` will be removed. If these variants are still used in the database, this will fail.
  - The values [VEEDOR] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Area_new" AS ENUM ('COWORKING', 'AUDITORIO', 'LABORATORIO', 'AULA_1', 'AULA_2', 'AULA_3', 'AULA_4', 'AULA_5', 'AULA_6', 'RECEPCION_ESTE', 'RECEPCION_OESTE', 'EXPLANADA', 'PLAZA', 'SALA_REUNIONES');
ALTER TABLE "events" ALTER COLUMN "area" TYPE "Area_new" USING ("area"::text::"Area_new");
ALTER TYPE "Area" RENAME TO "Area_old";
ALTER TYPE "Area_new" RENAME TO "Area";
DROP TYPE "public"."Area_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('ADMIN');
ALTER TABLE "public"."users" ALTER COLUMN "rol" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "rol" TYPE "Role_new" USING ("rol"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "users" ALTER COLUMN "rol" SET DEFAULT 'ADMIN';
COMMIT;

-- AlterEnum
ALTER TYPE "TipoEvento" ADD VALUE 'ESCOLAR';

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "rol" SET DEFAULT 'ADMIN';
