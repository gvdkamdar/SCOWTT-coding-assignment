import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    session: { strategy: "jwt" },
    callbacks: {
        async jwt({ token, user }) {
            if (user) token.id = (user as any).id;
            return token;
        },
        async session({ session, token }) {
            if (session.user && token.id) (session.user as any).id = token.id as string;
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};

export function getAuthSession() {
    return getServerSession(authOptions);
}
