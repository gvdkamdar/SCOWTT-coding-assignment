-- AlterTable
ALTER TABLE "public"."MovieFact" ADD COLUMN     "factKey" TEXT;

-- CreateIndex
CREATE INDEX "MovieFact_movieId_factKey_idx" ON "public"."MovieFact"("movieId", "factKey");
