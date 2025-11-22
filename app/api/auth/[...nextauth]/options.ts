import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connect } from "@/DataBase/mongo.config";
import { User } from "@/model/user";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs"; // ✅ ADDED

import { Session } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

export const authOptions: AuthOptions = {
  pages: {
    signIn: "/login", // ✅ FIXED: Changed from ".login" to "/login"
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        await connect();

        // Check if user exists
        const findUser = await User.findOne({ email: user.email });
        if (findUser) {
          return true;
        }

        // Create new user for OAuth providers
        await User.create({
          name: user.name,
          email: user.email,
          // Add provider info if needed
          provider: account?.provider,
        });
        return true;
      } catch (err) {
        console.log("Error in signIn callback:", err);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        
          session.user.id = token.id as string;
        
      }
      return session;
    },
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "Enter Your Email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        await connect();
        const user = await User.findOne({ email: credentials.email });

        if (user && bcrypt.compareSync(credentials.password, user.password)) {
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
          };
        }
        return null;
      },
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!, // ✅ FIXED: Standard naming
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  secret: process.env.NEXTAUTH_SECRET, // ✅ ADDED
  debug: process.env.NODE_ENV === "development", // ✅ ADDED for debugging
};