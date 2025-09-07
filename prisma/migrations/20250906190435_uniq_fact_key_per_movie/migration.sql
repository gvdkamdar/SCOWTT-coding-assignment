/*
  Warnings:

  - A unique constraint covering the columns `[movieId,factKey]` on the table `MovieFact` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "uniq_movie_fact_key" ON "public"."MovieFact"("movieId", "factKey");
