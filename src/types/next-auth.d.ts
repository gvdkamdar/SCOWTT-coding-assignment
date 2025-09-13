import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string; // added this for database queries
            name?: string | null;
            email?: string | null;
            image?: string | null;
        } & DefaultSession["user"];
    }

    interface User extends DefaultUser {
        id: string; // added this for database queries
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id?: string;
    }
}
