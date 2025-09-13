"use client";

import { useEffect, useState, useRef } from "react";

type FactResponse =
    | { ok: true; type: "stored" | "generated"; movieTitle: string; factId: string; factText: string }
    | { ok: false; message: string; actions?: string[] };

export default function FactCard() {
    const [loading, setLoading] = useState(true);
    const [resp, setResp] = useState<FactResponse | null>(null);
    const fetchedOnceRef = useRef(false); // <— add this

    // src/components/FactCard.tsx
    async function fetchFact(mode?: "previous" | "fresh") {
        setLoading(true);
        try {
            const url = mode ? `/api/funfact?mode=${mode}` : "/api/funfact";
            const r = await fetch(url, {
                cache: "no-store",
                credentials: "include",        // <— ensure cookie is sent/received
            });
            const j = (await r.json()) as FactResponse;
            setResp(j);
        } catch {
            setResp({ ok: false, message: "Failed to load a fact. Please try again." });
        } finally {
            setLoading(false);
        }
    }


    useEffect(() => {
        if (fetchedOnceRef.current) return;
        fetchedOnceRef.current = true;
        fetchFact();
    }, []);

    return (
        <div className="card" style={{ marginTop: 16 }}>
            <h2 style={{ marginTop: 0 }}>Fun fact</h2>
            {loading && <p>Loading…</p>}

            {!loading && resp?.ok && (
                <>
                    <p style={{ marginBottom: 8 }}><strong>{resp.movieTitle}</strong></p>
                    <p style={{ marginTop: 0 }}>{resp.factText}</p>

                    <div className="spacer" />
                    <div className="row">
                        <button
                            onClick={() => fetchFact()}
                            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd" }}
                        >
                            Try again
                        </button>
                        <button
                            onClick={() => fetchFact("previous")}
                            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd" }}
                        >
                            Show previous fact
                        </button>
                    </div>
                </>
            )}

            {!loading && resp && !resp.ok && (
                <>
                    <p style={{ color: "#7f1d1d", background: "#fef2f2", padding: 8, borderRadius: 8 }}>
                        {resp.message}
                    </p>
                    <div className="spacer" />
                    <div className="row">
                        <button
                            onClick={() => fetchFact()}
                            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd" }}
                        >
                            Try again
                        </button>
                        <button
                            onClick={() => fetchFact("previous")}
                            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd" }}
                        >
                            Show previous fact
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
