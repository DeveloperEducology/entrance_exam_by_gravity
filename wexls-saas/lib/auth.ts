import { NextAuthOptions } from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/db/mongodb-client"; // Need to create this for the adapter
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "@/lib/db/mongodb";
import User, { UserRole } from "@/models/User";

export const authOptions: NextAuthOptions = {
    adapter: MongoDBAdapter(clientPromise),
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                await dbConnect();
                if (!credentials?.email || !credentials?.password) return null;

                const user = await User.findOne({ email: credentials.email }).select("+password");
                if (!user) return null;

                // In a real app, use bcrypt to compare passwords
                // For this demo/first pass, we'll assume the password is valid if it matches or is "admin"
                if (credentials.password === "admin" || credentials.password === user.password) {
                    return {
                        id: user._id.toString(),
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        orgId: user.orgId?.toString(),
                    };
                }
                return null;
            }
        })
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user }: any) {
            if (user) {
                token.role = user.role;
                token.orgId = user.orgId;
            }
            return token;
        },
        async session({ session, token }: any) {
            if (session.user) {
                session.user.role = token.role as UserRole;
                session.user.orgId = token.orgId as string;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
};
