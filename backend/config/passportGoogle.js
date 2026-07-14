import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/user.js";

const BACKEND_URL = process.env.BACKEND_URL;

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${BACKEND_URL}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const username = email ? email.split("@")[0] : profile.id;
        const nama_lengkap = profile.displayName;
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
          user.email = email;
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
