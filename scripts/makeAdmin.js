// src/scripts/makeAdmin.js
import { sequelize } from "../config/database.js";
import User from "../database/models/core/User.js";

const makeAdmin = async (phone) => {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connected");

    // Multiple phone formats try karo
    const formats = [
      phone,
      `+${phone}`,
      phone.replace("+", ""),
      `+91${phone.replace("+91", "").replace("+", "")}`,
    ];

    console.log("🔍 Searching for phone:", phone);
    console.log("   Trying formats:", formats);

    let user = null;
    for (const fmt of formats) {
      user = await User.findOne({ where: { phone: fmt } });
      if (user) {
        console.log(`   ✅ Found with format: ${fmt}`);
        break;
      }
    }

    if (!user) {
      console.log("❌ User not found in any format");
      console.log("");
      console.log("📌 SOLUTION:");
      console.log("   1. Admin panel kholo");
      console.log("   2. Is number se Firebase OTP login karo");
      console.log("   3. User create ho jayega DB me");
      console.log("   4. Fir ye script dobara chalao");
      process.exit(1);
    }

    console.log("");
    console.log("📋 User found:");
    console.log("   ID:", user.id);
    console.log("   Phone:", user.phone);
    console.log("   Name:", user.firstName, user.lastName || "");
    console.log("   Current Role:", user.role);
    console.log("   Account Status:", user.accountStatus);

    // ═══════════════════════════════════════════════════════════
    // ✅ FIX: Only ACTIVE users can be promoted to ADMIN
    // ═══════════════════════════════════════════════════════════
    if (user.accountStatus !== "ACTIVE") {
      console.log("");
      console.log("═══════════════════════════════════════");
      console.log(`❌ CANNOT PROMOTE — account status is ${user.accountStatus}`);
      console.log("   Only ACTIVE users can be promoted to ADMIN.");
      console.log("═══════════════════════════════════════");
      process.exit(1);
    }

    if (!user.isActive) {
      console.log("");
      console.log("═══════════════════════════════════════");
      console.log("❌ CANNOT PROMOTE — user is inactive");
      console.log("   Activate the user first.");
      console.log("═══════════════════════════════════════");
      process.exit(1);
    }

    // Role update karo
    await user.update({ role: "ADMIN" });

    console.log("");
    console.log("═══════════════════════════════════════");
    console.log("✅ USER PROMOTED TO ADMIN!");
    console.log("   New Role:", user.role);
    console.log("═══════════════════════════════════════");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
};

const phone = process.argv[2];
if (!phone) {
  console.log("Usage: node src/scripts/makeAdmin.js 9649032436");
  process.exit(1);
}

makeAdmin(phone);