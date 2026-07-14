/**
 * Data Migration Script - Phase 2
 * 
 * Assign all existing records to "Pusat" (central) branch
 * Update all financial models with branch_id
 * 
 * Gunakan: node scripts/migrateDataToBranch.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Branch from "../models/branch.js";
import Transaksi from "../models/datatransaksi.js";
import Laporan from "../models/datalaporan.js";
import PengeluaranBiaya from "../models/pengeluaranbiaya.js";
import Cart from "../models/cart.js";
import User from "../models/user.js";

dotenv.config();

const migrateDataToBranch = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connected to MongoDB");

    // Find or create Pusat branch
    let pusatBranch = await Branch.findOne({ nama: "Pusat" });
    if (!pusatBranch) {
      console.error("❌ Pusat branch not found. Please run seedRBACFoundation.js first");
      process.exit(1);
    }

    console.log(`\n📍 Using Pusat branch ID: ${pusatBranch._id}`);

    // ===== MIGRATE TRANSAKSI =====
    console.log("\n📊 Migrating Transaksi...");
    const transaksiNoBranch = await Transaksi.countDocuments({
      branch_id: { $exists: false }
    });
    console.log(`   Found ${transaksiNoBranch} records without branch_id`);

    if (transaksiNoBranch > 0) {
      const transaksiResult = await Transaksi.updateMany(
        { branch_id: { $exists: false } },
        { $set: { branch_id: pusatBranch._id } }
      );
      console.log(`   ✅ Updated ${transaksiResult.modifiedCount} Transaksi records`);
    } else {
      console.log("   ℹ️ All Transaksi records already have branch_id");
    }

    // ===== MIGRATE LAPORAN =====
    console.log("\n📈 Migrating Laporan...");
    const laporanNoBranch = await Laporan.countDocuments({
      branch_id: { $exists: false }
    });
    console.log(`   Found ${laporanNoBranch} records without branch_id`);

    if (laporanNoBranch > 0) {
      const laporanResult = await Laporan.updateMany(
        { branch_id: { $exists: false } },
        { $set: { branch_id: pusatBranch._id } }
      );
      console.log(`   ✅ Updated ${laporanResult.modifiedCount} Laporan records`);
    } else {
      console.log("   ℹ️ All Laporan records already have branch_id");
    }

    // ===== MIGRATE PENGELUARAN BIAYA =====
    console.log("\n💸 Migrating PengeluaranBiaya...");
    const pengeluaranNoBranch = await PengeluaranBiaya.countDocuments({
      branch_id: { $exists: false }
    });
    console.log(`   Found ${pengeluaranNoBranch} records without branch_id`);

    if (pengeluaranNoBranch > 0) {
      const pengeluaranResult = await PengeluaranBiaya.updateMany(
        { branch_id: { $exists: false } },
        { $set: { branch_id: pusatBranch._id } }
      );
      console.log(`   ✅ Updated ${pengeluaranResult.modifiedCount} PengeluaranBiaya records`);
    } else {
      console.log("   ℹ️ All PengeluaranBiaya records already have branch_id");
    }

    // ===== MIGRATE CART =====
    console.log("\n🛒 Migrating Cart...");
    const cartNoBranch = await Cart.countDocuments({
      branch_id: { $exists: false }
    });
    console.log(`   Found ${cartNoBranch} records without branch_id`);

    if (cartNoBranch > 0) {
      const cartResult = await Cart.updateMany(
        { branch_id: { $exists: false } },
        { $set: { branch_id: pusatBranch._id } }
      );
      console.log(`   ✅ Updated ${cartResult.modifiedCount} Cart records`);
    } else {
      console.log("   ℹ️ All Cart records already have branch_id");
    }

    // ===== MIGRATION USERS =====
    console.log("\n👥 Migrating Users (admin/super-admin users)...");
    
    const usersNoBranch = await User.countDocuments({
      $or: [
        { branch_id: { $exists: false } },
        { branch_id: null }
      ],
      role: { $in: ["admin", "super-admin"] }
    });
    
    console.log(`   Found ${usersNoBranch} admin/super-admin users without branch_id`);

    if (usersNoBranch > 0) {
      const usersResult = await User.updateMany(
        {
          $or: [
            { branch_id: { $exists: false } },
            { branch_id: null }
          ],
          role: { $in: ["admin", "super-admin"] }
        },
        { $set: { branch_id: null } } // Keep NULL for pusat users (can access all branches)
      );
      console.log(`   ✅ Updated ${usersResult.modifiedCount} admin/super-admin users`);
    }

    // Assign branch-level users to Pusat (can be reassigned later)
    console.log("\n   Assigning branch-level users to Pusat...");
    const branchUsersNoBranch = await User.countDocuments({
      $or: [
        { branch_id: { $exists: false } },
        { branch_id: null }
      ],
      role: { $nin: ["admin", "super-admin"] }
    });

    if (branchUsersNoBranch > 0) {
      const branchUsersResult = await User.updateMany(
        {
          $or: [
            { branch_id: { $exists: false } },
            { branch_id: null }
          ],
          role: { $nin: ["admin", "super-admin"] }
        },
        { $set: { branch_id: pusatBranch._id } }
      );
      console.log(`   ✅ Assigned ${branchUsersResult.modifiedCount} branch-level users to Pusat`);
    }

    // ===== VERIFICATION =====
    console.log("\n🔍 Verification:");
    const transaksiTotal = await Transaksi.countDocuments({});
    const transaksiWithBranch = await Transaksi.countDocuments({ branch_id: { $exists: true } });
    console.log(`   Transaksi: ${transaksiWithBranch}/${transaksiTotal} have branch_id`);

    const laporanTotal = await Laporan.countDocuments({});
    const laporanWithBranch = await Laporan.countDocuments({ branch_id: { $exists: true } });
    console.log(`   Laporan: ${laporanWithBranch}/${laporanTotal} have branch_id`);

    const pengeluaranTotal = await PengeluaranBiaya.countDocuments({});
    const pengeluaranWithBranch = await PengeluaranBiaya.countDocuments({ branch_id: { $exists: true } });
    console.log(`   PengeluaranBiaya: ${pengeluaranWithBranch}/${pengeluaranTotal} have branch_id`);

    const cartTotal = await Cart.countDocuments({});
    const cartWithBranch = await Cart.countDocuments({ branch_id: { $exists: true } });
    console.log(`   Cart: ${cartWithBranch}/${cartTotal} have branch_id`);

    const usersTotal = await User.countDocuments({});
    const usersWithBranch = await User.countDocuments({ branch_id: { $exists: true } });
    console.log(`   Users: ${usersWithBranch}/${usersTotal} have branch_id`);

    // Check for any records still missing branch_id
    const recordsMissingBranch = transaksiTotal - transaksiWithBranch +
                                   laporanTotal - laporanWithBranch +
                                   pengeluaranTotal - pengeluaranWithBranch +
                                   cartTotal - cartWithBranch;

    if (recordsMissingBranch === 0) {
      console.log("\n🎉 Data migration completed successfully!");
      console.log("✅ All records now have branch_id assigned");
    } else {
      console.warn(`\n⚠️  ${recordsMissingBranch} records still missing branch_id`);
      console.warn("   Review manually or fix in next migration run");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error during migration:", error);
    process.exit(1);
  }
};

migrateDataToBranch();
