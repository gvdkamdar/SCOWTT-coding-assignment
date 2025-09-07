// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Movie Facts",
  description: "Login with Google, then see your profile.",
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{props.children}</Providers>
      </body>
    </html>
  );
}
