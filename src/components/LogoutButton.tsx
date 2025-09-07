"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
    return (
        <button
            onClick={() => signOut()}
            style={{
                padding: "10px 16px",
                borderRadius: 8,
                background: "#ef4444",
                color: "white",
                border: "none",
                fontSize: 16,
            }}
        >
            Logout
        </button>
    );
}
