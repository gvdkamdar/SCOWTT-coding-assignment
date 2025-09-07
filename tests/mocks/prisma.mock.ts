import { vi } from "vitest";

// Minimal in-memory store for movies and facts
const db = {
    movies: new Map<string, { id: string; title: string; normalizedTitle: string; year: number | null }>(),
    facts: new Map<
        string,
        { id: string; movieId: string; factText: string; factKey: string | null; factCategory: string | null; createdAt: Date }
    >(),
};

let idCounter = 1;
function id() {
    return "test_" + idCounter++;
}

export const prismaMock = {
    user: {
        findUnique: vi.fn(),
        update: vi.fn(),
    },
    movie: {
        upsert: vi.fn(async ({ where, create }: any) => {
            const key = `${where.normalizedTitle_year.normalizedTitle}::${where.normalizedTitle_year.year ?? "null"}`;
            let found = [...db.movies.values()].find(
                m => `${m.normalizedTitle}::${m.year ?? "null"}` === key
            );
            if (!found) {
                const rec = { id: id(), ...create };
                db.movies.set(rec.id, rec);
                return rec;
            }
            return found;
        }),
        findUnique: vi.fn(async ({ where }: any) => {
            return db.movies.get(where.id) || null;
        }),
    },
    movieFact: {
        findMany: vi.fn(async ({ where, select, orderBy, take }: any) => {
            let facts = [...db.facts.values()].filter(f => f.movieId === where.movieId);
            if (where.id?.in) facts = facts.filter(f => where.id.in.includes(f.id));
            if (where.factKey?.notIn) facts = facts.filter(f => !where.factKey.notIn.includes(f.factKey));
            if (where.id?.notIn) facts = facts.filter(f => !where.id.notIn.includes(f.id));
            if (orderBy?.createdAt === "desc") facts = facts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            if (typeof take === "number") facts = facts.slice(0, take);
            // apply select
            return facts.map(f => {
                const out: any = {};
                for (const k of Object.keys(select ?? { id: true, factText: true })) out[k] = (f as any)[k];
                return out;
            });
        }),
        create: vi.fn(async ({ data }: any) => {
            // enforce unique (movieId, factKey) if provided
            if (data.factKey) {
                const dup = [...db.facts.values()].find(f => f.movieId === data.movieId && f.factKey === data.factKey);
                if (dup) {
                    const err: any = new Error("Unique constraint");
                    err.code = "P2002";
                    throw err;
                }
            }
            const rec = { id: id(), createdAt: new Date(), ...data };
            db.facts.set(rec.id, rec);
            return rec;
        }),
    },
};

export const prisma = prismaMock;

export function resetPrismaMock() {
    db.movies.clear();
    db.facts.clear();
    idCounter = 1;
}
