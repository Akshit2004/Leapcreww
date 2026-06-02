import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../shared/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        type: { label: "Type", type: "text" },
        attemptId: { label: "Attempt ID", type: "text" }
      },
      async authorize(credentials) {
        if (credentials?.type === "whatsapp") {
          if (!credentials.attemptId) {
            throw new Error("Missing WhatsApp verification attempt ID.");
          }

          const attempt = await prisma.whatsAppLoginAttempt.findUnique({
            where: { id: credentials.attemptId },
            include: {
              user: {
                include: {
                  memberships: {
                    include: {
                      organization: true
                    }
                  }
                }
              }
            }
          });

          if (!attempt) {
            throw new Error("WhatsApp authentication session not found.");
          }

          if (attempt.status !== "VERIFIED") {
            throw new Error("WhatsApp authentication has not been verified.");
          }

          if (attempt.expiresAt < new Date()) {
            throw new Error("WhatsApp authentication session has expired.");
          }

          const user = attempt.user;
          if (!user) {
            throw new Error("No user profile is associated with this verified phone number.");
          }

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
