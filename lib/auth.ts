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
      if (user) {
        token.id = user.id;
        const nutri = await prisma.nutricionistas.findUnique({
          where: { id: user.id as string },
          select: { crn: true, nome: true },
        });
        if (nutri) {
          token.crn = nutri.crn ?? "";
          token.nomeNutri = nutri.nome;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session.user) {
        const u = session.user as { id?: string; crn?: string; nomeNutri?: string };
        u.id = token.id as string;
        u.crn = (token.crn as string) ?? "";
        u.nomeNutri = (token.nomeNutri as string) ?? "";
      }
      return session;
    },
  },

  pages: { signIn: "/" },
  secret: process.env.NEXTAUTH_SECRET,
};
