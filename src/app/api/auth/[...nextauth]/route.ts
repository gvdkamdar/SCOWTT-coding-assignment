import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Create a single handler function and export it for both methods.
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
