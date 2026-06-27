import Settings from "../../../models/settings.js";
import cloudinary from "../../../config/cloudinary.js";

export const updateStoreInfo = async (req, res) => {
  try {
    const { storeName, ownerName, emailOwner, storeAddress, storePhone } = req.body;
    let storeLogo;
    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "store_logos" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
      storeLogo = uploadResult.secure_url;
    }
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        storeName,
        ownerName,
        emailOwner,
        defaultUser,
        storeAddress,
        storePhone,
      });
    } else {
      if (storeName !== undefined) settings.storeName = storeName;
      if (ownerName !== undefined) settings.ownerName = ownerName;
      if (emailOwner !== undefined) settings.emailOwner = emailOwner;
      if (storeLogo !== undefined) settings.storeLogo = storeLogo;
      if (storeAddress !== undefined) settings.storeAddress = storeAddress;
      if (storePhone !== undefined) settings.storePhone = storePhone;
      await settings.save();
    }
    res.json({ message: "Informasi toko berhasil diperbarui!", settings }); 
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
