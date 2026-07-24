import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/user.js";

const BACKEND_URL = (process.env.BACKEND_URL || "").replace(/\/+$/, "");
const GOOGLE_CALLBACK_URL = (process.env.GOOGLE_CALLBACK_URL || `${BACKEND_URL}/api/auth/google/callback`).replace(/\/+$/, "");

if (!GOOGLE_CALLBACK_URL || GOOGLE_CALLBACK_URL === "/api/auth/google/callback") {
  console.warn(
    "[passportGoogle] WARNING: GOOGLE_CALLBACK_URL is not configured. Set GOOGLE_CALLBACK_URL env to your deployed callback URL."
  );
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const rawEmail = profile.emails?.[0]?.value;
        const email = rawEmail ? String(rawEmail).trim().toLowerCase() : `${profile.id}@google-oauth.no-email`;
        const username = profile.username || (email ? email.split("@")[0] : profile.id);
        const nama_lengkap = profile.displayName || username;
        const foto_profile = profile.photos?.[0]?.value || null;

        // 🔍 Cari user berdasarkan googleId
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.create({
            googleId: profile.id,
            username,
            email,
            nama_lengkap,
            profilePicture: foto_profile,
            role: "user",
            status: "aktif",
            branch_id: null,
          });
        } else {
          // Update data jika berubah
          user.nama_lengkap = nama_lengkap;
          user.profilePicture = foto_profile;
          user.email = email || user.email || `${user._id}@google-oauth.no-email`;
          user.status = "aktif";
          await user.save();
        }

        // 🔥 Kirim ke next middleware (callback router)
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

export default passport;
