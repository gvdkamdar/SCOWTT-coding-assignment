import { NextResponse, NextRequest } from "next/server";
import { FactService } from "@/services/factService"
import { readRecentCookie, addRecentId, writeRecentCookie } from "@/lib/recentFacts";

export async function GET(req: NextRequest) {
    try {
        // first extract reuqest parameteres and the cookie data
        const mode = req.nextUrl.searchParams.get("mode") ?? "fresh";
        const cookieData = readRecentCookie(req)

        // then get movie fact
        const selectedFact = await FactService.getMovieFact(mode, cookieData)

        console.log("🔍 API DEBUG - FactService Response:", {
            ok: selectedFact.ok,
            factId: selectedFact.factId,
            movieId: selectedFact.movieId,
            movieTitle: selectedFact.movieTitle,
            factText: selectedFact.factText?.substring(0, 100) + "...", // First 100 chars
            type: selectedFact.type
        });
        // handling response data and cookies 
        // ---------no idea what this is yet--------------
        const response = NextResponse.json(selectedFact, {
            headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
                "Surrogate-Control": "no-store",
            },
        });

        // update the cookie that is served with new selected fact
        if (selectedFact.ok && selectedFact.factId && selectedFact.movieId) {
            const updatedCookie = addRecentId(cookieData, selectedFact.movieId, selectedFact.factId);
            writeRecentCookie(response, updatedCookie)
            console.log("Cookie Updated", selectedFact.movieId)
        }

        return response;

    } catch (error) {
        console.error("Funfact API failed:", error);
        return NextResponse.json(
            { ok: false, message: "Failed to fetch a fact" },
            { status: 500 }
        );
    }
}


// old dubug logs
// const rawIn = req.cookies.get(COOKIE_NAME)?.value ?? "<none>";
// console.log("FUNFACT cookie IN:", rawIn.slice(0, 180))

// console.log("FUNFACT filters:", {
//     movieId: movie.id,
//     seenIdsCount: seenIds.length,
//     seenIdsHead: seenIds.slice(0, 5),
//     seenKeysCount: seenKeys.size,
//     lastRecentCategory,
// });

// writes the recent updated cookie based on the fact back to the browser, i think
// const respond = (data: any, updatedObj?: typeof recentObj) => {
//     const res = NextResponse.json(data, noStore());
//     if (updatedObj) {
//         writeRecentCookie(res, updatedObj);
//         const rawOut = JSON.stringify(updatedObj);
//         console.log("FUNFACT cookie OUT:", rawOut.slice(0, 180));
//     }
//     return res;
// };

// Optional extra guard in case of weird race
// if (!created) {
//     created =
//         (await prisma.movieFact.findFirst({
//             where: { movieId: movie.id, factKey: accepted.key },
//         })) ?? created;
// }

// console.log("SERVE", {
//     type: "generated",
//     id: created.id,
//     key: created.factKey ?? null,
//     cat: created.factCategory ?? null,
// });
