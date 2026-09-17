// src/scripts/makeAdmin.js
// Usage: node src/scripts/makeAdmin.js +919460097816
import { sequelize } from "../config/database.js";
import User from "../database/models/core/User.js";

const makeAdmin = async (phone) => {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connected");

    const user = await User.findOne({ where: { phone } });

    if (!user) {
      console.log("❌ User not found with phone:", phone);
      console.log("   Pehle user ko mobile app ya admin panel se login karo");
      process.exit(1);
    }

    console.log("📋 Found user:");
    console.log("   ID:", user.id);
    console.log("   Phone:", user.phone);
    console.log("   Current role:", user.role);

    await user.update({ role: "ADMIN" });

    console.log("✅ User promoted to ADMIN!");
    console.log("   New role:", user.role);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

const phone = process.argv[2];
if (!phone) {
  console.log("Usage: node src/scripts/makeAdmin.js +919460097816");
  process.exit(1);
}

makeAdmin(phone);