-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "favoriteMovieId" TEXT;

-- CreateTable
CREATE TABLE "public"."Movie" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "year" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MovieFact" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "factText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovieFact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Movie_normalizedTitle_year_key" ON "public"."Movie"("normalizedTitle", "year");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_favoriteMovieId_fkey" FOREIGN KEY ("favoriteMovieId") REFERENCES "public"."Movie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MovieFact" ADD CONSTRAINT "MovieFact_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "public"."Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
