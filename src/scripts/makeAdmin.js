// src/scripts/makeAdmin.js
import { sequelize } from "../config/database.js";
import User from "../database/models/core/User.js";

const makeAdmin = async (phone) => {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connected");

    // Multiple formats try karo
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