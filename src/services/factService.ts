import { UserService } from "@/services/userService"
import { MovieDao } from "@/dao/movieDao"
import { FactDao, FactCandidate } from "@/dao/factDao"
import { AIService } from "@/services/aiService"
import { getRecentIds } from "@/lib/recentFacts";
import { normalizeFact, normalizeKey } from "@/lib/normalize";

// interface to return the face response 
export interface FactResponse {
    ok: boolean;
    factText?: string;
    message?: string | null;
    factId?: string | null;
    movieTitle?: string | null;
    type?: string | null;
    movieId?: string | null;
}

// interface for the cookie response 
export interface PreviousFactData {
    seenIds: string[],
    recentCategory: string | null;
    recentNormalizedText: Set<string>;
    seenKeys: Set<string>;
}

const GEN_RETRIES = 4
const MIN_CONFIDENCE = 0.6

// main class for having all the functions 
export class FactService {
    static async getMovieFact(mode: string, cookieData: any): Promise<FactResponse> {
        // get the user authenticated and catch for any errors 
        const userResult = await UserService.validateUserAccess();
        if (!userResult.success) {
            if (userResult.redirectTo === "/login") {
                return { ok: false, message: "Not autheticated." };
            }
            if (userResult.redirectTo === "/onboarding") {
                return { ok: false, message: "No favorite movie set." };
            }
            return { ok: false, message: "Session Access Denied" }
        }

        // console.log("🔍 SERVICE DEBUG - User favoriteMovieId:", userResult.user.favoriteMovieId);

        // get movie using the ID
        const movieResult = await MovieDao.getMovieById(userResult.user.favoriteMovieId!);
        if (!movieResult) {
            return { ok: false, message: "Movie not found" };
        }

        // console.log("🔍 SERVICE DEBUG - Movie found:", {
        //     id: movieResult.id,
        //     title: movieResult.title,
        //     year: movieResult.year
        // });
        // filter to manage fact duplication 
        const recentFactData = await this.getPreviousFactsData(cookieData, movieResult.id);
        // function for previous mode, getting correct fact then
        if (mode === "previous") {
            // console.log("🔍 SERVICE DEBUG - Taking PREVIOUS path");

            // first get previous fact
            const previousFact = await this.getPreviousFact(recentFactData, cookieData, movieResult.id);
            if (!previousFact) {
                return { ok: false, message: "No previous fact avaiable" };
            }
            const movieTitle = movieResult.year ? `${movieResult.title} (${movieResult.year})` : movieResult.title;
            return {
                ok: true,
                type: "stored",
                factId: previousFact.id,
                factText: previousFact.factText,
                movieTitle: movieTitle,
                movieId: movieResult.id,
                message: null
            };
        };
        // if not previous then we try a stored fact 
        // selecting the best out of the stored facts
        const bestStoredFact = await this.pickBestStoredFact(movieResult.id, recentFactData);
        if (bestStoredFact) {
            const movieTitle = movieResult.year ? `${movieResult.title} (${movieResult.year})` : movieResult.title;
            return {
                ok: true,
                type: "stored",
                factId: bestStoredFact.id,
                factText: bestStoredFact.factText,
                movieTitle: movieTitle,
                movieId: movieResult.id,
                message: null
            };
        };
        console.log("🔍 DEDUP DEBUG - No stored facts found, falling back to AI generation");
        // so now if no best stored facts then we will genereate from AI
        return await this.generateAIFact(movieResult, recentFactData);
    }

    // function to manage fact deduplication and returning recent fact data
    private static async getPreviousFactsData(cookieDataMap: any, movieId: string): Promise<PreviousFactData> {
        // first extract the seen ids from the cookie
        // the cookieData will be a dict where each movieId maps to list of seen fact Ids 
        // here we get a list of seenIds with newest first
        const seenIdList = getRecentIds(cookieDataMap, movieId);
        // from the ID we will fetch the fact info
        // seen facts is a list of fact objects
        const seenFactsList = await FactDao.getAllFactsByIds(seenIdList);
        // from this we will create a map seenId -> fact objects
        // .map((f) => [f.id, f] creates an array of pairs [["factId", factObject], [], ...]
        // new Map() converts pairs to map
        const seenIdMap = new Map(seenFactsList.map((f) => [f.id, f]));
        // then we will get the most recent fact used for the show previous fact
        // using the map, we find the most recent fact by taking the first fact from the extracted list 
        const mostRecentFact = seenIdMap.get(seenIdList[0] ?? "");
        // we extract the category of the most recent fact
        // if mostrecentfact is defined, look into fact category
        // if this whole thing exists then that or pass empty string
        const mostRecentCategory = (mostRecentFact?.factCategory ?? "").toLowerCase();
        // we also get the text and normalize it 
        // if mostrefact defined then see fact text
        // if this true then normalize else return empty
        const mostRecentNormalizedFactText = new Set<string>(
            mostRecentFact?.factText ? [normalizeFact(mostRecentFact.factText)] : []
        );
        // collect all the seen fact keys in list
        // --------laern how this line works----------
        const seenKeys = new Set<string>(
            seenFactsList
                // creates array of normalized fact key if fact key exists else empty
                .map((f) => (f.factKey ? normalizeKey(f.factKey) : "")) // extract, normalize
                .filter(Boolean) // remove empty strings
        );
        return {
            seenIds: seenIdList,
            recentCategory: mostRecentCategory,
            recentNormalizedText: mostRecentNormalizedFactText,
            seenKeys: seenKeys
        }
    }

    // function to select one of the stored facts 
    private static async pickBestStoredFact(movieId: string, previousFactsData: PreviousFactData): Promise<FactCandidate | null> {
        const seenIdSet = new Set(previousFactsData.seenIds)
        // get all the facts as a list excluding seen facts
        const unseenFactsList = await FactDao.getAllFactsForMovie_ExcludingFacts_(
            movieId,
            previousFactsData.seenIds,
            25,
            "desc"
        );
        // double check 
        const unseenFactsListChecked = unseenFactsList.filter((c) => !seenIdSet.has(c.id));
        // filtering out the facts with the same fact key and normalizing
        const unseenNewKeyFactsList = unseenFactsListChecked.filter((c) => {
            const k = c.factKey ? normalizeKey(c.factKey) : "";
            return k && !previousFactsData.seenKeys.has(k);
        });
        // choosing a different category of facts 
        const unseenNewKeyNewCategoryFact = unseenNewKeyFactsList.find((c) => {
            const category = (c.factCategory ?? "").toLowerCase();
            return !previousFactsData.recentCategory || (category && category !== previousFactsData.recentCategory);
        });
        // fallback to avoid paraphrasing if no different category is there
        const finalSelectedFact =
            unseenNewKeyNewCategoryFact
            ?? unseenNewKeyFactsList.find((c) =>
                !previousFactsData.recentNormalizedText.has(normalizeFact(c.factText))
            );

        return finalSelectedFact ?? null;
    }

    // function to get just previous fact
    private static async getPreviousFact(previousFactsData: PreviousFactData, cookieData: any, movieId: string): Promise<FactCandidate | null> {
        // first we get id of just the previous fact
        const previousId = previousFactsData.seenIds.find((_, idx) => idx > 0);
        // then get the fact based on the id
        if (previousId) {
            return await FactDao.getFactById(previousId);
        }
        return null;
    }

    // function to generate a fact using LLMs
    private static async generateAIFact(
        movie: { id: string, title: string, year: number | null },
        recentFactData: PreviousFactData
    ): Promise<FactResponse> {
        console.log("🔍 DEDUP DEBUG - Starting AI generation");
        console.log("🔍 DEDUP DEBUG - Recent seen IDs count:", recentFactData.seenIds.length);
        // find existing facts for a given movie id
        const currentFactList = await FactDao.getAllFactsForMovie(movie.id, 300);
        // from the list of facts find the fact keys  
        const currentFactKeys = new Set(
            currentFactList
                .map((f) => (f.factKey ? normalizeKey(f.factKey) : ""))
                .filter((k) => k.length > 0)
        );
        // getting normalized fact text
        const currentNormalizedFactText = new Set(currentFactList.map((f) => normalizeFact(f.factText)));
        // getting the categories 
        const currentFactCategories = new Set(
            currentFactList
                .map((f) => (f.factCategory ?? "").toLowerCase())
                .filter(Boolean)
        );
        // prefer unused categories 
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
        const preferUnusedCategories = allCategories.filter((c) => !currentFactCategories.has(c));
        // generate facts multiple times with retries 
        let accepted = null;
        for (let attempt = 0; attempt < GEN_RETRIES; attempt++) {
            // call Ai service for each attempt 
            const { factKey, confidence, factText, category } = await AIService.generateMovieFact({
                movieTitle: movie.title,
                movieYear: movie.year,
                avoidKeys: [...currentFactKeys],
                preferCategories: preferUnusedCategories,
            });
            // normalizing the AI response 
            const keyDup = factKey ? currentFactKeys.has(normalizeKey(factKey)) : false;
            const textDup = factText ? currentNormalizedFactText.has(normalizeFact(factText)) : false;
            const lowConf = confidence < MIN_CONFIDENCE;
            const sameRecentCat = category === recentFactData.recentCategory;
            // check the above records and validate response 
            if (factKey && factText && !keyDup && !textDup && !lowConf && !sameRecentCat) {
                accepted = { text: factText, key: normalizeKey(factKey), category }
                break; // success so exit
            }
        }
        // if we run out of all possible unique facts 
        if (!accepted) {
            return { ok: false, message: "No more Unique Facts Available!" };
        }
        // add the fact to db if valid
        const created = await FactDao.createFact(
            movie.id,
            accepted.text,
            accepted.key,
            accepted.category,
        );
        // return the response
        return {
            ok: true,
            type: "generated",
            movieTitle: movie.year ? `${movie.title} (${movie.year})` : movie.title,
            movieId: movie.id,
            factId: created.id,
            factText: created.factText
        };
    }
}