// on clicking login, the next auth sign in function is called
// we get routed to the signin/google page
// next js looks for all possible api routes after /api/auth/
// thats why we have the [...nextauth]
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// then handler is called and auth options passed to it
// handler first recieves get request 
// sees path to signin/google page
// we go to google, then next auth again routes to /api/auth/[...nextauth]/route
// next auth sees callback/google
// next auth creates account session, exchanges token
// next auth sends user to home page
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
