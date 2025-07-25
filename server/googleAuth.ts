import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

export async function setupGoogleAuth(app: Express) {
  // Google OAuth Strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}/api/auth/google/callback`
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Extract user info from Google profile
      const googleUser = {
        id: profile.id,
        email: profile.emails?.[0]?.value || '',
        firstName: profile.name?.givenName || '',
        lastName: profile.name?.familyName || '',
        profileImageUrl: profile.photos?.[0]?.value || '',
      };

      // Check if user exists by email first
      let existingUser = await storage.getUserByEmail(googleUser.email);
      
      if (existingUser) {
        // User exists - update their Google info if needed
        existingUser = await storage.updateUser(existingUser.id, {
          profileImageUrl: googleUser.profileImageUrl || existingUser.profileImageUrl,
        });
      } else {
        // New user - create with Google prefix
        existingUser = await storage.upsertUser({
          id: `google_${googleUser.id}`,
          email: googleUser.email,
          firstName: googleUser.firstName,
          lastName: googleUser.lastName,
          profileImageUrl: googleUser.profileImageUrl,
        });
      }

      // Create session user object using existing user ID
      const sessionUser = {
        claims: {
          sub: existingUser.id, // Use the actual user ID from database
          email: existingUser.email,
          first_name: existingUser.firstName,
          last_name: existingUser.lastName,
          profile_image_url: existingUser.profileImageUrl,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 1 week
        },
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
      };

      return done(null, sessionUser);
    } catch (error) {
      console.error("Google OAuth error:", error);
      return done(error, false);
    }
  }));

  // Google OAuth routes
  app.get('/api/auth/google', 
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      prompt: 'select_account' // Always show account selector
    })
  );

  app.get('/api/auth/google/callback',
    passport.authenticate('google', { 
      failureRedirect: '/login-failed',
      successReturnToOrRedirect: '/'
    })
  );
}

export const isGoogleAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  // For Google OAuth, we don't have refresh token handling in this simple implementation
  // In production, you'd want to implement token refresh
  res.status(401).json({ message: "Session expired" });
};