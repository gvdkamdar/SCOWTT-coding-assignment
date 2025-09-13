import { redirect } from "next/navigation";
import { MovieService } from "@/services/movieService"
import { UserService } from "@/services/userService"

export default async function OnboardingPage() {
    // redirect user to login if no email
    const userAccessResult = await UserService.validateUserAccess(true);
    if (!userAccessResult.success) {
        redirect(userAccessResult.redirectTo);
    }

    // if user already has a fav movie, redirect to home
    if (userAccessResult.user.favoriteMovieId) {
        redirect("/");
    }

    // function to add movie if it doesn't exist
    async function saveMovie(formData: FormData) {
        "use server";

        // this will come from user service, done again so that session is not lost
        const userAccessResult = await UserService.validateUserAccess(true);
        // check again to catch errors if any 
        if (!userAccessResult.success) { redirect(userAccessResult.redirectTo) };

        // data extracted from user input
        const rawTitle = String(formData.get("title") ?? "");
        const rawYear = String(formData.get("year") ?? "");
        // if (!rawTitle) return;

        // add movie to db
        const result = await MovieService.setUserFavoriteMovie(
            // ! at end to tell typescript that email is not null
            userAccessResult.user.email!,
            { title: rawTitle, year: rawYear }
        );
        // error if movie was not added 
        if (!result.success) {
            console.error("Failed to add movie", result.error);
            return;
        }
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
