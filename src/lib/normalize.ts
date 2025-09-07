export function normalizeTitle(input: string): string {
    return input
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, "")
        .replace(/\s+/g, " ")
        .trim();
}


export function normalizeFact(s: string) {
    s = s.toLowerCase();
    // collapse punctuation to spaces
    s = s.replace(/[-–—_,.!?;:()[\]{}'"`]/g, " ");
    // remove extra spaces
    s = s.replace(/\s+/g, " ").trim();

    // 🔹 remove common stopwords (tune this list as you like)
    s = s.replace(/\b(?:the|a|an|on|in|of|to|and|for|with|by|at|from)\b/g, " ");
    s = s.replace(/\s+/g, " ").trim();

    return s;
}


export function withYear(title: string, year: number | null): string {
    return year ? `${title} (${year})` : title;
}

const NUMBER_WORDS: Record<string, string> = {
    zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5",
    six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
    eleven: "11", twelve: "12", thirteen: "13", fourteen: "14", fifteen: "15",
    sixteen: "16", seventeen: "17", eighteen: "18", nineteen: "19",
    twenty: "20", thirty: "30", forty: "40", fifty: "50", sixty: "60",
    seventy: "70", eighty: "80", ninety: "90", hundred: "100"
};

function numbersToDigits(str: string) {
    return str.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\b/gi,
        (w) => NUMBER_WORDS[w.toLowerCase()] ?? w);
}

export function normalizeKey(input: string): string {
    let s = input.toLowerCase().trim();

    // unify spaces/punct to underscores
    s = s.replace(/[^a-z0-9]+/g, "_");

    // numbers in words -> digits
    s = numbersToDigits(s);

    // common synonyms -> canonical tokens
    s = s
        .replace(/\b(oscar|oscars|academy_award|academy_awards)\b/g, "oscars")
        .replace(/\b(vfx|visual_effect|visual_effects)\b/g, "visual_effects")
        .replace(/\b(science_fiction|sci[_]?fi)\b/g, "sci_fi")
        .replace(/\b(best_)?film_editing\b/g, "film_editing")
        .replace(/\b(best_)?sound_editing\b/g, "sound_editing")
        .replace(/\b(best_)?sound_mixing\b/g, "sound_mixing");

    // collapse repeats
    s = s.replace(/_+/g, "_").replace(/^_+|_+$/g, "");
    return s;
}

// crude category mapping from key
export function categoryFromKey(key: string): string {
    const k = key.toLowerCase();
    if (/oscar|oscars|award/.test(k)) return "awards";
    if (/box_office|gross|revenue/.test(k)) return "box_office";
    if (/visual_effects|vfx|stunt|choreography|bullet_time|wirework/.test(k)) return "production";
    if (/editing|sound_editing|sound_mixing|cinematography|screenplay/.test(k)) return "production";
    if (/reception|critics?|rotten_tomatoes|metacritic|imdb/.test(k)) return "reception";
    if (/casting|cast|actor|actress/.test(k)) return "casting";
    if (/director|direction|wachowski/.test(k)) return "direction";
    if (/soundtrack|score|music|composer/.test(k)) return "soundtrack";
    if (/filming|location|shoot|australia|studio/.test(k)) return "filming";
    if (/release|distribution|marketing|premiere/.test(k)) return "release";
    return "misc";
}
