import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

const createPrismaClient = () =>
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

export const prisma = createPrismaClient();
