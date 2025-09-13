import { getAuthSession } from "@/lib/auth";
import { UserDao, UserProfile } from "@/dao/userDao";

// so this will use the functinos created in dao user class
// it only has the business logic and not the database operations

// we have another interface to ensure return type is consistent
// if success, then we have user, if not we redirect
export type UserAccessResult =
    | { success: true; user: UserProfile }
    | { success: false; redirectTo: string };

// user service class to contain all user related business logic
export class UserService {
    // function to get current authenticated user profile or redirection 
    static async validateUserAccess(skipOnboardingCheck = false): Promise<UserAccessResult> {
        try {
            // first get auth session
            const session = await getAuthSession();
            // is session null, or user null, then email mull
            const userEmail = session?.user?.email
            // if no email, ask them to login
            if (!userEmail) {
                return { success: false, redirectTo: "/login" }
            }
            // if email, record profile from email
            const profile = await UserDao.findByEmail(userEmail);
            // if no profile, ask to login again
            if (!profile) {
                return { success: false, redirectTo: "/login" }
            }
            // if no favorite movie, and not already on onboarding page, ask to onboard
            if (!profile.favoriteMovieId && !skipOnboardingCheck) {
                return { success: false, redirectTo: "/onboarding" }
            }
            // if all good, return user and true
            return {
                success: true,
                user: profile,
            };
        } catch (error) {
            // any other error, ask to login
            return { success: false, redirectTo: "/login" }
        }
    }
}