// src/lib/recentFacts.ts
import { NextRequest, NextResponse } from "next/server";

export type CookieShape = Record<string, string[]>;

export const COOKIE_NAME = "recent_facts_v1";
// A safe cap for cookie size. ~4KB total cookie budget → 60–90 short ids fits fine.
// Tune down if you hit cookie size issues; tune up if you want longer history.
const MAX_PER_MOVIE = 80;

/** Parse the cookie from the incoming request. */
export function readRecentCookie(req: NextRequest): CookieShape {
    const raw = req.cookies.get(COOKIE_NAME)?.value ?? "";
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed as CookieShape;
    } catch { /* ignore */ }
    return {};
}

/** Write the cookie onto the outgoing response. */
export function writeRecentCookie(res: NextResponse, obj: CookieShape) {
    res.cookies.set({
        name: COOKIE_NAME,
        value: JSON.stringify(obj),
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24, // 1 day
    });
}

/** Get the full list of seen ids for this movie (newest-first). */
export function getRecentIds(obj: CookieShape, movieId: string): string[] {
    const arr = obj[movieId];
    return Array.isArray(arr) ? arr.slice() : [];
}

/** Prepend an id, dedupe, and cap to MAX_PER_MOVIE (no “keep last 5” nonsense). */
export function addRecentId(obj: CookieShape, movieId: string, id: string): CookieShape {
    const cur = getRecentIds(obj, movieId);
    const next = [id, ...cur.filter((x) => x !== id)];
    if (next.length > MAX_PER_MOVIE) next.length = MAX_PER_MOVIE;
    return { ...obj, [movieId]: next };
}
