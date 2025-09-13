// we are using this import to get access to the prisma client instance

import { prisma } from "@/lib/prisma";

// we are using this interface to define the user profile
// by doing this we make it type safe, editor shows available properties
// other option is type, it can do dynamic creation of properties 
// it can do union, and when we restrict the use of a property to set things
// type can be used for functions 
export interface UserProfile {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    favoriteMovieId: string | null;
}

// DAO class to conatin all user table operations with the database
export class UserDao {
    // function to get user profile by email 
    // static to show it belonds to clas and not instance
    // await to pause function till promise is resolved
    // promise is a value that will be available in future asynchronously
    // findUnique is a prisma generated function based on model schema
    static async findByEmail(email: string): Promise<UserProfile | null> {
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                favoriteMovieId: true,
            },
        });

        return user;
    }
    // update the users favorite movie, only updation so no return 
    static async updateFavoriteMovie(email: string, movieId: string): Promise<void> {
        await prisma.user.update({
            where: { email },
            data: { favoriteMovieId: movieId },
        });
    }

    // function to get fav movie by email
    static async getFavoriteMovieByEmail(email: string): Promise< string | null > {
        const user = await prisma.user.findUnique({
            where: { email },
            select: { favoriteMovieId: true },
        });
        // ?. after var, check if null return undefined
        // ?? means if left side is null/undefined user right side
        return user?.favoriteMovieId ?? null;
    }

}



