import { NextResponse, NextRequest } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { openai, FACT_MODEL } from "@/lib/openai";
import { normalizeFact, normalizeKey, categoryFromKey } from "@/lib/normalize";
import {
    readRecentCookie,
    getRecentIds,
    addRecentId,
    writeRecentCookie,
    COOKIE_NAME,
} from "@/lib/recentFacts";

const GEN_RETRIES = 4;
const CONFIDENCE_MIN = 0.6;

export async function GET(req: NextRequest) {
    try {
        const session = await getAuthSession();
        const email = session?.user?.email;
        if (!email) {
            return NextResponse.json({ ok: false, message: "Not authenticated." }, { status: 401 });
        }

        const mode = req.nextUrl.searchParams.get("mode") ?? "fresh";

        const user = await prisma.user.findUnique({
            where: { email },
            select: { favoriteMovieId: true },
        });
        if (!user?.favoriteMovieId) {
            return NextResponse.json({ ok: false, message: "No favorite movie set." }, { status: 400 });
        }

        const movie = await prisma.movie.findUnique({
            where: { id: user.favoriteMovieId },
            select: { id: true, title: true, year: true },
        });
        if (!movie) {
            return NextResponse.json({ ok: false, message: "Movie not found." }, { status: 404 });
        }

        // Read cookie
        const recentObj = readRecentCookie(req);

        const rawIn = req.cookies.get(COOKIE_NAME)?.value ?? "<none>";
        console.log("FUNFACT cookie IN:", rawIn.slice(0, 180))

        // ALL seen ids (newest-first in our cookie)
        const seenIds = getRecentIds(recentObj, movie.id);

        // Fetch seen facts (include keys + categories)
        const seenFacts: { id: string; factText: string; factCategory: string | null; factKey: string | null }[] =
            seenIds.length
                ? await prisma.movieFact.findMany({
                    where: { id: { in: seenIds } },
                    select: { id: true, factText: true, factCategory: true, factKey: true },
                })
                : [];

        // Build lookup by id (because findMany doesn't preserve cookie order)
        const seenById = new Map(seenFacts.map((f) => [f.id, f]));

        // “Latest” = first ID in cookie (newest-first)
        const latest = seenById.get(seenIds[0] ?? "");
        const lastRecentCategory = (latest?.factCategory ?? "").toLowerCase() || null;

        // Paraphrase block: only the latest text
        const recentNorm = new Set<string>(
            latest?.factText ? [normalizeFact(latest.factText)] : []
        );

        // Idea-level block: all seen keys
        const seenKeys = new Set<string>(
            seenFacts
                .map((f) => (f.factKey ? normalizeKey(f.factKey) : ""))
                .filter(Boolean)
        );

        console.log("FUNFACT filters:", {
            movieId: movie.id,
            seenIdsCount: seenIds.length,
            seenIdsHead: seenIds.slice(0, 5),
            seenKeysCount: seenKeys.size,
            lastRecentCategory,
        });

        const respond = (data: any, updatedObj?: typeof recentObj) => {
            const res = NextResponse.json(data, noStore());
            if (updatedObj) {
                writeRecentCookie(res, updatedObj);
                const rawOut = JSON.stringify(updatedObj);
                console.log("FUNFACT cookie OUT:", rawOut.slice(0, 180));
            }
            return res;
        };

        // Stored facts helper with category preference
        const pickStored = async () => {
            const seenIdSet = new Set(seenIds);

            // Pull a handful. Use notIn for clarity.
            const candidates: {
                id: string;
                factText: string;
                factCategory: string | null;
                factKey: string | null;
            }[] = await prisma.movieFact.findMany({
                where: {
                    movieId: movie.id,
                    id: { notIn: seenIds },          // <— notIn
                },
                orderBy: { createdAt: "desc" },
                take: 25,
                select: { id: true, factText: true, factCategory: true, factKey: true },
            });

            // DEBUG: detect any overlap (should be zero)
            const overlap = candidates.filter((c) => seenIdSet.has(c.id)).map((c) => c.id);
            if (overlap.length) {
                console.warn("pickStored: OVERLAP with seenIds (should be 0):", {
                    movieId: movie.id,
                    seenCount: seenIds.length,
                    overlapCount: overlap.length,
                    overlap,
                });
            }

            // Hard client-side filter (belt-and-suspenders)
            const unSeen = candidates.filter((c) => !seenIdSet.has(c.id));

            // Filter out any candidate whose key is already seen (idea-level)
            const novel = unSeen.filter((c) => {
                const k = c.factKey ? normalizeKey(c.factKey) : "";
                return k && !seenKeys.has(k);
            });

            // Prefer a different category than the most recent
            const byCat = novel.find((c) => {
                const cat = (c.factCategory ?? "").toLowerCase();
                return !lastRecentCategory || (cat && cat !== lastRecentCategory);
            });

            // Else pick any non-paraphrase of the latest
            const good =
                byCat ?? novel.find((c) => !recentNorm.has(normalizeFact(c.factText)));

            // DEBUG: log what we decided
            console.log("pickStored:", {
                movieId: movie.id,
                seenCount: seenIds.length,
                candidates: candidates.map((c) => c.id),
                chosen: good ? { id: good.id, key: good.factKey, cat: good.factCategory } : null,
            });

            return good ?? null;
        };




        if (mode === "previous") {
            // immediate previous = 2nd entry in cookie
            const prevId = seenIds.find((_, idx) => idx > 0);
            if (prevId) {
                const prev = seenById.get(prevId) ?? (await prisma.movieFact.findUnique({
                    where: { id: prevId },
                    select: { id: true, factText: true },
                }));

                if (prev) {
                    const updated = addRecentId(recentObj, movie.id, prev.id); // moves it to front
                    return respond(
                        {
                            ok: true,
                            type: "stored",
                            movieTitle: withYear(movie.title, movie.year),
                            factId: prev.id,
                            text: prev.factText,
                        },
                        updated
                    );
                }
            }
            // else: fall through to generation
        }



        // Try stored first
        const stored = await pickStored();
        if (stored) {
            if (seenIds.includes(stored.id)) {
                console.warn("Refusing to serve seen ID at final gate:", stored.id);
            } else {
                console.log("SERVE", {
                    type: "stored",
                    id: stored.id,
                    key: stored.factKey ?? null,
                    cat: stored.factCategory ?? null,
                });
                const updated = addRecentId(recentObj, movie.id, stored.id);
                return respond(
                    {
                        ok: true,
                        type: "stored",
                        movieTitle: withYear(movie.title, movie.year),
                        factId: stored.id,
                        text: stored.factText,
                    },
                    updated
                );
            }
        }
        // Fall through to generation if the stored pick got rejected for safety.




        // Existing data for dedupe and category preference
        const existing: { id: string; factText: string; factKey: string | null; factCategory: string | null }[] =
            await prisma.movieFact.findMany({
                where: { movieId: movie.id },
                select: { id: true, factText: true, factKey: true, factCategory: true },
                orderBy: { createdAt: "desc" },
                take: 300,
            });

        const existingKeys = new Set(
            existing
                .map((f) => (f.factKey ? normalizeKey(f.factKey) : ""))
                .filter((k) => k.length > 0)
        );
        const existingNorm = new Set(existing.map((f) => normalizeFact(f.factText)));
        const usedCategories = new Set(
            existing
                .map((f) => (f.factCategory ?? "").toLowerCase())
                .filter(Boolean)
        );

        // Prefer unused categories first
        const allCategories = [
            "awards",
            "box_office",
            "production",
            "reception",
            "casting",
            "direction",
            "soundtrack",
            "filming",
            "release",
            "misc",
        ];
        const preferCategories = allCategories.filter((c) => !usedCategories.has(c));

        let accepted: { text: string; key: string; category: string } | null = null;

        for (let attempt = 0; attempt < GEN_RETRIES; attempt++) {
            const { factText, confidence, factKey, category } = await generateFact(
                withYear(movie.title, movie.year),
                [...existingKeys],
                preferCategories
            );
            if (!factText || !factKey) continue;

            const keyNorm = normalizeKey(factKey);
            const textNorm = normalizeFact(factText);
            const cat = (category ?? "").toLowerCase() || categoryFromKey(keyNorm);

            const keyDup = existingKeys.has(keyNorm);
            const textDup = existingNorm.has(textNorm) || recentNorm.has(textNorm);
            const sameRecentCat = lastRecentCategory && cat === lastRecentCategory;
            const lowConf = confidence < CONFIDENCE_MIN;

            if (!keyDup && !textDup && !lowConf && !sameRecentCat) {
                accepted = { text: factText, key: keyNorm, category: cat };
                break;
            }
        }

        if (!accepted) {
            return respond({
                ok: false,
                message: "No fresh fact right now. Try again or show a previous fact.",
                actions: ["retry", "previous"],
            });
        }


        // AFTER — idempotent write
        let created = await prisma.movieFact.upsert({
            where: {
                // Prisma auto-creates a unique selector for @@unique([movieId, factKey])
                movieId_factKey: { movieId: movie.id, factKey: accepted.key },
            },
            update: {}, // nothing to update; key uniquely identifies the idea
            create: {
                movieId: movie.id,
                factText: accepted.text,
                factKey: accepted.key,
                factCategory: accepted.category,
            },
        });

        // (Optional extra guard in case of weird race)
        if (!created) {
            created =
                (await prisma.movieFact.findFirst({
                    where: { movieId: movie.id, factKey: accepted.key },
                })) ?? created;
        }

        console.log("SERVE", {
            type: "generated",
            id: created.id,
            key: created.factKey ?? null,
            cat: created.factCategory ?? null,
        });

        const updated = addRecentId(recentObj, movie.id, created.id);
        return respond(
            {
                ok: true,
                type: "generated",
                movieTitle: withYear(movie.title, movie.year),
                factId: created.id,
                text: created.factText,
            },
            updated
        );
    } catch (err) {
        console.error("funfact error", err);
        return NextResponse.json({ ok: false, message: "Failed to fetch a fact." }, { status: 500 });
    }
}

function withYear(title: string, year: number | null | undefined): string {
    return year ? `${title} (${year})` : title;
}

function noStore() {
    return {
        headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
            SurrogateControl: "no-store",
        },
    };
}

async function generateFact(
    movieTitleWithYear: string,
    avoidKeys: string[],
    preferCategories: string[]
): Promise<{ factText: string | null; confidence: number; factKey: string | null; category: string | null }> {
    const system = `Return STRICT JSON with keys: fact_text (string), confidence (0..1), fact_key (string), category (one of: awards, box_office, production, reception, casting, direction, soundtrack, filming, release, misc).
Rules:
- Use digits for numbers (e.g., 4 not "four").
- Use canonical tokens in fact_key: "oscars" (not "academy_awards"), "visual_effects" (not "vfx"), "sci_fi" (not "science_fiction").
- Keep to 1–2 sentences. Avoid spoilers beyond first 10 minutes.
- fact_key is a SHORT lowercase underscore key for the core claim.`;

    const user = `Movie: ${movieTitleWithYear}
Avoid keys (do NOT reuse): ${avoidKeys.join(", ") || "(none)"}
Prefer unused categories first: ${preferCategories.join(", ") || "(none)"}
Return JSON ONLY, e.g.:
{"fact_text":"The film popularized 'bullet time' slow-motion, achieved with a rig of still cameras.","confidence":0.83,"fact_key":"bullet_time_visual_effects","category":"production"}`;

    try {
        const chat = await openai.chat.completions.create({
            model: FACT_MODEL,
            temperature: 0.7,
            messages: [
                { role: "system", content: system },
                { role: "user", content: user },
            ],
        });

        const raw = chat.choices[0]?.message?.content ?? "";
        const parsed = safeJson(raw);
        const factText: string | null = typeof parsed?.fact_text === "string" ? parsed.fact_text.trim() : null;
        const conf: number =
            typeof parsed?.confidence === "number" && isFinite(parsed.confidence)
                ? Math.max(0, Math.min(1, parsed.confidence))
                : 0.5;
        const key: string | null =
            typeof parsed?.fact_key === "string" && parsed.fact_key.trim().length > 0
                ? parsed.fact_key.trim()
                : null;
        const category: string | null =
            typeof parsed?.category === "string" && parsed.category.trim().length > 0
                ? parsed.category.trim().toLowerCase()
                : null;

        return { factText, confidence: conf, factKey: key, category };
    } catch {
        return { factText: null, confidence: 0, factKey: null, category: null };
    }
}

function safeJson(input: string): any {
    try {
        return JSON.parse(input);
    } catch { }
    const m = input.match(/{[\s\S]*}/);
    if (m) {
        try {
            return JSON.parse(m[0]);
        } catch { }
    }
    return null;
}
