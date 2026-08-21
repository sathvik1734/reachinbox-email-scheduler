import type { User as PrismaUser } from "@prisma/client";

declare global {
  namespace Express {
    interface User extends Pick<PrismaUser, "id" | "email" | "name" | "avatarUrl"> {}
  }
}

declare module "express-session" {
  interface SessionData {
    passport?: { user: string };
  }
}

export {};
