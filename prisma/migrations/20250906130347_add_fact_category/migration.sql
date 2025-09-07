-- AlterTable
ALTER TABLE "public"."MovieFact" ADD COLUMN     "factCategory" TEXT;

-- CreateIndex
CREATE INDEX "MovieFact_movieId_factCategory_idx" ON "public"."MovieFact"("movieId", "factCategory");
