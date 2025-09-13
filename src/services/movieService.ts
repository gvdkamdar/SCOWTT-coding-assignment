import { MovieDao } from "@/dao/movieDao"
import { UserDao } from "@/dao/userDao"
import { normalizeTitle } from "@/lib/normalize"

// movie interface for input when adding a movie
export interface MovieInput {
    title: string;
    year?: string;
}

// movie interface for giving back result 
export interface MovieResult {
    success: boolean;
    movieId?: string;
    error?: string;
}

// movie service class for all movie related business login 
export class MovieService {
    // function to add users fav movie 
    static async setUserFavoriteMovie(userEmail: string, movieInput: MovieInput): Promise<MovieResult> {
        // check if input is valid
        const title = movieInput.title.trim(); // user trim to clean trailing / leading spaces
        if (!title) {
            return { success: false, error: "Movie title is required" };
        }

        // parse the year
        let year: number | null = null;
        if (movieInput.year) {
            const yearNum = Number(movieInput.year.trim());
            // if year is invalid
            if (isNaN(yearNum)) {
                return { success: false, error: "Invalid year format" };
            }
            year = yearNum;
        }
        try {
            const normalizedTitle = normalizeTitle(title);

            // check for existing movie 
            const existing = await MovieDao.findByNormalizedTitle(normalizedTitle, year);

            // use existing if not null, else create the movie
            const movie = existing ?? (await MovieDao.create(title, normalizedTitle, year))

            // update the users favorite movie
            await UserDao.updateFavoriteMovie(userEmail, movie.id);

            return { success: true, movieId: movie.id };
        } catch (error) {
            console.error("Error setting user favorite movie", error);
            return { success: false, error: "Failed to set the users favorite movie" };
        }
    }
}