// backend/controllers/transaksi/helpers/kasirHelper.js

import User from "../../../models/user.js";
import Counter from "../../../models/counter.js";
import { getRoleByCode } from "../../../utils/roleHelper.js";

export const pilihKasirRoundRobin = async () => {
  // Get the kasir role by code instead of querying by role name
  const kasirRole = await getRoleByCode("kasir");
  if (!kasirRole) {
    throw new Error("Role kasir tidak ditemukan dalam sistem");
  }

  const kasirAktif = await User.find({ 
    role_id: kasirRole._id, 
    status: "aktif" 
  });
  
  if (!kasirAktif || kasirAktif.length === 0) {
    throw new Error("Tidak ada kasir aktif saat ini");
  }

  const counterKey = "round_robin_kasir";
  const updatedCounter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  const index = (updatedCounter.value - 1) % kasirAktif.length;
  const kasirTerpilih = kasirAktif[index];

  return kasirTerpilih;
};