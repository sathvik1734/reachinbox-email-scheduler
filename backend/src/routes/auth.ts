import { Router } from "express";
import { env } from "../config/env.js";
import { passport } from "../auth/passport.js";

export const authRouter = Router();

authRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], prompt: "select_account" }),
);

authRouter.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${env.FRONTEND_URL}/login?error=oauth` }),
  (_req, res) => res.redirect(`${env.FRONTEND_URL}/dashboard`),
);

authRouter.get("/me", (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Please sign in" } });
    return;
  }
  res.json({ user: req.user });
});

authRouter.post("/logout", (req, res, next) => {
  req.logout((error) => {
    if (error) return next(error);
    req.session.destroy((sessionError) => {
      if (sessionError) return next(sessionError);
      res.clearCookie("reachinbox.sid");
      res.status(204).send();
    });
  });
});
