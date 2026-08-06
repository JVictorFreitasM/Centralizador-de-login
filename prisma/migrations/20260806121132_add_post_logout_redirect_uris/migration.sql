-- AlterTable
ALTER TABLE "systems" ADD COLUMN     "post_logout_redirect_uris" TEXT[] DEFAULT ARRAY[]::TEXT[];
