import OpenAI from "openai";

export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Pick a small, fast model. You can switch later if needed.
export const FACT_MODEL = "gpt-4o-mini";
