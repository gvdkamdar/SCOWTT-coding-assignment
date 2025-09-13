import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";

import { prisma } from "./prisma";
import { PrismaAdapter } from "@next-auth/prisma-adapter";


// gets passed into the next auth api route handler
// NextAuthOptions is predefined interface from next-auth
// we create our own auth options, and pass them to the next auth api route handler
export const authOptions: NextAuthOptions = {
    // adapter to connect to prisma (postgres db)
    // ORM handles all db operations and loading enteries and tables
    adapter: PrismaAdapter(prisma),
    // ! after variable tells TS that var will definitiely exist
    // configure google oauth provider
    // login -> google consent request -> redirection after user approval 
    // -> authorization codes exchanged for access / refresh tokens 
    // -> next auth gets profile from google API
    // NextAuth → Google OAuth → User Consent → Google Callback → NextAuth
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    // 2 options, jwt or database
    // jwt, faster, stateless, not as secure, uses encrypted cookies
    // database, more secure, 
    session: { strategy: "jwt" },
    callbacks: {
        // adds user id to jwt token to identify user from db
        async jwt({ token, user }) {
            if (user) token.id = (user as any).id;
            return token;
        },
        // adds user id to session to identify user from db
        async session({ session, token }) {
            if (session.user && token.id) (session.user as any).id = token.id as string;
            return session;
        },
    },
    // random string to encrypt cookies
    secret: process.env.NEXTAUTH_SECRET,
};

export function getAuthSession() {
    return getServerSession(authOptions);
}
