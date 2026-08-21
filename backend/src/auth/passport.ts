import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, avatarUrl: true },
    });
    done(null, user ?? false);
  } catch (error) {
    done(error);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
      state: true,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("Google account did not provide an email address"));

        const user = await prisma.user.upsert({
          where: { googleId: profile.id },
          create: {
            googleId: profile.id,
            email: email.toLowerCase(),
            name: profile.displayName,
            avatarUrl: profile.photos?.[0]?.value,
          },
          update: {
            email: email.toLowerCase(),
            name: profile.displayName,
            avatarUrl: profile.photos?.[0]?.value,
          },
          select: { id: true, email: true, name: true, avatarUrl: true },
        });

        done(null, user);
      } catch (error) {
        done(error as Error);
      }
    },
  ),
);

export { passport };
