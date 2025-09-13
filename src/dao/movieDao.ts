import { prisma } from "@/lib/prisma";

// we will again create an interface for movie object
export interface Movie {
    id: string;
    title: string;
    year: number | null;
    createdAt: Date;
    normalizedTitle: string;
}

export interface MovieBasic{
    id: string;
    year: number | null;
    title: string;
}

// now create a class for all movie dao functions
export class MovieDao {
    // finding movie by title, if there is already a movie 
    static async findByNormalizedTitle(normalizedTitle: string, year: number | null): Promise<Movie | null> {
        return await prisma.movie.findFirst({
            where: { normalizedTitle, year },
        });
    }

    // create movie row if not found 
    static async create(title: string, normalizedTitle: string, year: number | null): Promise<Movie> {
        return await prisma.movie.create({
            data: { title, normalizedTitle, year },
        });
    }

    // function to get given movie from id
    static async getMovieById(id: string): Promise <MovieBasic | null> {
        return await prisma.movie.findUnique({
            where: { id },
            select: { 
                id: true,
                title: true,
                year: true,
            },
        });
    }
}