-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "dmtPermissions" JSONB,
ADD COLUMN     "impsPermissions" JSONB,
ADD COLUMN     "upiPermissions" JSONB;
