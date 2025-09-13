import { prisma } from "@/lib/prisma"

// we will create an interface for the full movie facts card
export interface MovieFact {
    id: string;
    movieId: string;
    factText: string;
    factKey: string | null;
    factCategory: string | null;
    createdAt: Date;
}

// another for a more minimal facts focussed card 
export interface FactCandidate {
    id: string;
    factText: string;
    factKey: string | null;
    factCategory: string | null;
}

// class for fact DAO functions 
export class FactDao {
    // OK - one function to add facts for a movie
    static async createFact(
        movieId: string,
        factText: string,
        factKey: string | null,
        factCategory: string | null
    ): Promise<MovieFact> {
        return await prisma.movieFact.create({
            data: { movieId, factText, factKey, factCategory },
        });
    }

    // OK - function to get all facts based on fact ids
    static async getAllFactsByIds(id: string[]): Promise<FactCandidate[]> {
        if (id.length === 0) return [];

        return await prisma.movieFact.findMany({
            where: { id: { in: id } },
            select: {
                id: true,
                factKey: true,
                factCategory: true,
                factText: true
            },
        });
    }

    // OK - function to get all facts based on movie id and fact id(not included)
    static async getAllFactsForMovie_ExcludingFacts_(
        movieId: string,
        excludeIds: string[],
        limit: number,
        orderBy: 'desc' | 'asc' = 'desc'
    ): Promise<FactCandidate[]> {
        return await prisma.movieFact.findMany({
            where: {
                movieId,
                id: { notIn: excludeIds },
            },
            orderBy: { createdAt: orderBy },
            take: limit,
            select: {
                id: true,
                factKey: true,
                factCategory: true,
                factText: true
            },
        });
    }

    // OK - one function to get fact by id 
    static async getFactById(id: string): Promise<FactCandidate | null> {
        return await prisma.movieFact.findUnique({
            where: { id },
            select: {
                id: true,
                factKey: true,
                factCategory: true,
                factText: true
            },
        });
    }

    // OK - function to get all facts by movie id, by order
    static async getAllFactsForMovie(movieId: string, limit: number): Promise<MovieFact[]> {
        return await prisma.movieFact.findMany({
            where: { movieId },
            orderBy: { createdAt: "desc" },
            take: limit,
        });
    }
}