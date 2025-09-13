import { openai, FACT_MODEL } from "@/lib/openai";

// one interface to parse the request 
export interface AIFactRequest {
    movieTitle: string;
    movieYear: number | null;
    preferCategories: string[];
    avoidKeys: string[];
}

// on interface to parse the result 
export interface AIFactResponse {
    factText: string | null;
    factKey: string | null;
    category: string | null;
    confidence: number;
}

// class with all open AI functions 
export class AIService {
    // main function to generate the response for movie facts specifically 
    static async generateMovieFact(request: AIFactRequest): Promise<AIFactResponse> {
        try {
            // add year if exists then append it else just take title
            const movieTitleWithYear = request.movieYear
                ? `${request.movieTitle} (${request.movieYear})`
                : request.movieTitle;
            // building user prompt from input 
            const userPrompt = `Movie: ${movieTitleWithYear}
            Avoid Keys (do NOT reuse): ${request.avoidKeys.join(", ") || "none"}
            Prefer unused catefories first: ${request.preferCategories.join(", ") || "none"}
            Return JSON ONLY, e.g.: {
            "fact_text":"The film popularized 'bullet time' slow-motion, achieved with a rig of still cameras.",
            "confidence":0.83,
            "fact_key":"bullet_time_visual_effects",
            "category":"production"
            }`;

            // building system prompt 
            const systemPrompt = `
            Return STRICT JSON with keys: 
            fact_text (string), 
            confidence (0..1), 
            fact_key (string), 
            category (one of: awards, box_office, production, reception, casting, direction, soundtrack, filming, release, misc).
        
            Rules:
            - Use digits for numbers (e.g., 4 not "four").
            - Use canonical tokens in fact_key: "oscars" (not "academy_awards"), "visual_effects" (not "vfx"), "sci_fi" (not "science_fiction").
            - Keep to 1–2 sentences. Avoid spoilers beyond first 10 minutes.
            - fact_key is a SHORT lowercase underscore key for the core claim.
            `;
            // call open ai chat
            const rawResponse = await this.callOpenAI(systemPrompt, userPrompt);
            // validating raw response 
            const validJsonResponse = this.validateJson(rawResponse)
            // transforming irregualar answers 
            return this.transformResponse(validJsonResponse)
        } catch (error) {
            console.error("Movie fact Generation has failed:", error);
            return { factText: null, confidence: 0, factKey: null, category: null }
        }
    }

    // function to talk to parse request and get response from Open AI
    private static async callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
        const chat = await openai.chat.completions.create({
            model: FACT_MODEL,
            // 0 - deterministic, 1 - creative 
            temperature: 0.7,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        });
        // chat choice[0] is first and usually the only response 
        // chat.choices[0] = object or undefined 
        // ?.messages = if choice exists get the messages (object or null) else undefined
        // ?.content = if messages exist get content (content can be string or null) else undefined 
        // ?? -> if content null then use empty string
        return chat.choices[0]?.message?.content ?? "";
    }

    // function to validate the json response structure 
    private static validateJson(input: string): any {
        try {
            // directly try parsing as json if the input is just a valid json
            return JSON.parse(input);
        } catch {
            // using regex to find any instance of a valid json in the repsonse 
            // {[\s\S]*} = find '{' followed by any chars until '}'
            // it is under assumption that anything wrapped by {} will have valid json 
            const match = input.match(/{[\s\S]*}/);
            if (match) {
                try {
                    // then try parsing this first and only match found 
                    return JSON.parse(match[0]);
                } catch {
                    // but if it still fails then return null
                    return null;
                }
            }
        }
        // if its something absurd with no {} then null
        return null;
    }

    // function to transform the json response into our data formats 
    private static transformResponse(parsed: any): AIFactResponse {
        // if parsed.fact_text is not null and is string then trim _ else null
        const factText: string | null = typeof parsed?.fact_text === "string"
            ? parsed.fact_text.trim()
            : null;
        // if confidence is not null AND is number AND is finite 
        // then normalize between 0-1 else 0.5
        const confidence: number = typeof parsed?.confidence === "number"
            && isFinite(parsed.confidence)
            ? Math.max(0, Math.min(1, parsed.confidence))
            : 0.5;
        // if factkey is string AND not null AND trim is not empty
        // then factkey = trimmed else = null 
        const factKey: string | null = typeof parsed?.fact_key === "string"
            && parsed.fact_key.trim().length > 0
            ? parsed.fact_key.trim()
            : null;
        // if category is not null AND string AND trim is not empty
        // then category = trimmed lowered else = null
        const category: string | null = typeof parsed?.category === "string"
            && parsed.category.trim().length > 0
            ? parsed.category.trim().toLowerCase()
            : null;

        return { factText, confidence, factKey, category };
    }
}
