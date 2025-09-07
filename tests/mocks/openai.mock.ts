// tests/mocks/openai.mock.ts
export async function generateFacts(opts: { movieTitle: string; year: number | null; excludeKeys: string[]; k: number }) {
    const base = [
        { text: "Won 4 Oscars.", key: "oscars", category: "awards", conf: 0.98 },
        { text: "Released in 1999.", key: "release_date", category: "release", conf: 0.97 },
        { text: "Box office hit.", key: "box_office", category: "box_office", conf: 0.96 },
        { text: "Influential sci-fi.", key: "influence", category: "reception", conf: 0.95 },
        { text: "Directed by X.", key: "direction", category: "direction", conf: 0.95 },
    ];
    return base.filter(b => !opts.excludeKeys.includes(b.key)).slice(0, opts.k);
}
