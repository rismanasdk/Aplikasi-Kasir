import multer from "multer";

// simpan di memory → biar gampang langsung lempar ke cloudinary
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMime = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMime.includes(file.mimetype)) {
      return cb(new Error("Format file tidak didukung. Gunakan JPG, PNG, atau WEBP."));
    }
    cb(null, true);
  },
});

export default upload;

