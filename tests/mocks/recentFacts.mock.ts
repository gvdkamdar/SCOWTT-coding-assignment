// tests/mocks/recentFacts.mock.ts

// Keep the shape identical to your real module
export type CookieShape = Record<string, string[]>;

// Simple in-memory “cookie jar”
let jar: CookieShape = {};

/** Read the “cookie” (deep clone so tests can’t mutate the internal jar by reference). */
export function readRecentCookie(): CookieShape {
    return JSON.parse(JSON.stringify(jar));
}

/**
 * Write the “cookie”.
 * IMPORTANT: return the response object so your route code can keep chaining
 * (your real impl sets a cookie on NextResponse and returns it).
 */
export function writeRecentCookie<T>(res: T, obj: CookieShape): T {
    jar = JSON.parse(JSON.stringify(obj));
    return res;
}

/**
 * Add a seen fact id for a movie, with LRU behavior and cap.
 * Return a *new* object (pure function style) just like your server util.
 */
export function addSeenId(obj: CookieShape, movieId: string, factId: string, cap = 5): CookieShape {
    const next: CookieShape = { ...obj };
    const list = next[movieId] ? [...next[movieId]] : [];

    // Move to front if already present; else add to front
    const idx = list.indexOf(factId);
    if (idx !== -1) list.splice(idx, 1);
    list.unshift(factId);

    next[movieId] = list.slice(0, cap);

    // Mirror into jar so tests that *don’t* call writeRecentCookie still see the change
    jar = JSON.parse(JSON.stringify(next));
    return next;
}

/** Test helper to reset state between tests (called from tests/setup.ts). */
export function _resetJar() {
    jar = {};
}
