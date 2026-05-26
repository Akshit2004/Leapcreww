import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password credentials.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: {
            memberships: {
              include: {
                organization: true
              }
            }
          }
        });

        if (!user || !user.hashedPassword) {
          throw new Error("Incorrect email address or password.");
        }

        const isValid = await bcrypt.compare(credentials.password, user.hashedPassword);
        if (!isValid) {
          throw new Error("Incorrect email address or password.");
        }

        // Return user structure
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          organizations: (user.memberships as { organization: { id: string; name: string; slug: string }; role: string }[]).map((m) => ({
            id: m.organization.id,
            name: m.organization.name,
            slug: m.organization.slug,
            role: m.role
          }))
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        interface CustomUser {
          id: string;
          organizations?: Array<{ id: string; name: string; slug: string }>;
          activeOrgId?: string | null;
        }
        token.organizations = (user as unknown as CustomUser).organizations || [];
        token.activeOrgId = (user as unknown as CustomUser).organizations?.[0]?.id || null;
      }
      
      // Handle dynamic session updates from client (e.g. switching orgs)
      if (trigger === "update" && session) {
        if (session.activeOrgId) {
          token.activeOrgId = session.activeOrgId;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        interface CustomUser {
          id: string;
          organizations?: Array<{ id: string; name: string; slug: string }>;
          activeOrgId?: string | null;
        }
        (session.user as unknown as CustomUser).id = token.id as string;
        (session.user as unknown as CustomUser).organizations = (token.organizations as Array<{ id: string; name: string; slug: string }>) || [];
        (session.user as unknown as CustomUser).activeOrgId = (token.activeOrgId as string) || null;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
    error: "/login"
  },
  secret: process.env.NEXTAUTH_SECRET
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
