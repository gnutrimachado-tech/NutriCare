import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.nutricionistas.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const passwordMatch = await compare(credentials.password, user.senha_hash);
        if (!passwordMatch) return null;

        return { id: user.id, name: user.nome, email: user.email };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },

  pages: { signIn: "/" },
  secret: process.env.NEXTAUTH_SECRET,
};
