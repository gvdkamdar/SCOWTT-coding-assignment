import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";
import { normalizeTitle } from "@/lib/normalize";

export default async function OnboardingPage() {
    const session = await getAuthSession();
    if (!session?.user?.email) {
        redirect("/login");
    }

    const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { favoriteMovieId: true },
    });
    if (dbUser?.favoriteMovieId) {
        redirect("/");
    }

    async function saveMovie(formData: FormData) {
        "use server";

        const s = await getAuthSession();
        if (!s?.user?.email) redirect("/login");

        const rawTitle = String(formData.get("title") ?? "").trim();
        const rawYear = String(formData.get("year") ?? "").trim();
        if (!rawTitle) return;

        const year = rawYear ? Number(rawYear) : null;
        if (rawYear && Number.isNaN(year)) {
            // Simple guard, ignore invalid year
            return;
        }

        const normalizedTitle = normalizeTitle(rawTitle);

        // Step 1: look for an existing row, year can be null in findFirst
        const existing = await prisma.movie.findFirst({
            where: { normalizedTitle, year },
        });

        // Step 2: create if missing
        const movie =
            existing ??
            (await prisma.movie.create({
                data: { title: rawTitle, normalizedTitle, year },
            }));

        // Link to user
        await prisma.user.update({
            where: { email: s.user.email },
            data: { favoriteMovieId: movie.id },
        });

        redirect("/");
    }

    return (
        <main className="container">
            <div className="card">
                <h1>Tell us your favorite movie</h1>
                <p>We will show you a fresh fun fact about it on your home page.</p>
                <div className="spacer" />
                <form action={saveMovie} className="row" style={{ gap: 8, alignItems: "end" }}>
                    <div>
                        <label htmlFor="title" style={{ display: "block", fontWeight: 600 }}>
                            Movie title
                        </label>
                        <input
                            id="title"
                            name="title"
                            type="text"
                            placeholder="For example, The Matrix"
                            required
                            style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, width: 320 }}
                        />
                    </div>

                    <div>
                        <label htmlFor="year" style={{ display: "block", fontWeight: 600 }}>
                            Year (optional)
                        </label>
                        <input
                            id="year"
                            name="year"
                            type="number"
                            min="1888"
                            max="2100"
                            placeholder="1999"
                            style={{ padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, width: 120 }}
                        />
                    </div>

                    <button
                        type="submit"
                        style={{
                            padding: "10px 16px",
                            borderRadius: 8,
                            background: "#111827",
                            color: "white",
                            border: "none",
                            fontSize: 16,
                        }}
                    >
                        Save and continue
                    </button>
                </form>
            </div>
        </main>
    );
}
