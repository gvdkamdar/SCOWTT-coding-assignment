"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const { status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "authenticated") {
            router.replace("/");
        }
    }, [status, router]);

    return (
        <main className="container">
            <div className="card">
                <h1>Welcome</h1>
                <p>Sign in with Google to continue.</p>
                <div className="spacer" />
                <button
                    onClick={() => signIn("google")}
                    style={{ padding: "10px 16px", borderRadius: 8, background: "#1a73e8", color: "white", border: "none", fontSize: 16 }}
                >
                    Sign in with Google
                </button>
            </div>
        </main>
    );
}
