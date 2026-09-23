// scripts/backfillProfiles.js
import { sequelize } from "../src/config/database.js";
import User from "../src/database/models/core/User.js";
import RoleRequest from "../src/database/models/core/RoleRequest.js";
import Guider from "../src/database/models/core/Guider.js";
import Photographer from "../src/database/models/core/Photographer.js";
import IdCard from "../src/database/models/core/IdCard.js";
import Place from "../src/database/models/core/Place.js";

const generateCardNumber = (role) => {
  const prefix = role === "GUIDER" ? "LG-G" : "LG-P";
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${randomNum}`;
};

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connected\n");

    const users = await User.findAll({
      where: { role: ["GUIDER", "PHOTOGRAPHER"] },
    });

    console.log(`Found ${users.length} users with provider roles\n`);

    for (const user of users) {
      const approvedRequest = await RoleRequest.findOne({
        where: { userId: user.id, status: "APPROVED" },
        order: [["createdAt", "DESC"]],
      });

      if (!approvedRequest) {
        console.log(`⚠️  No approved request for ${user.email} — skipping`);
        continue;
      }

      const profileData = {
        userId: user.id,
        fullName: approvedRequest.fullName || user.firstName,
        companyName: approvedRequest.companyName,
        location: approvedRequest.location,
        selfieUrl: approvedRequest.selfieUrl,
        idFrontUrl: approvedRequest.idFrontUrl,
        idBackUrl: approvedRequest.idBackUrl,
        profilePhotoUrl: approvedRequest.profilePhotoUrl,
        placeIds: Array.isArray(approvedRequest.placeIds)
          ? approvedRequest.placeIds.map(String)
          : [],
        experience: 0,
        bio: approvedRequest.message || "",
        isActive: true,
      };

      const places = await Place.findAll({
        where: { id: profileData.placeIds },
        attributes: ["name"],
      });
      const placeNames = places.map((p) => p.name);

      if (user.role === "GUIDER") {
        const [g, created] = await Guider.findOrCreate({
          where: { userId: user.id },
          defaults: { ...profileData, languages: [] },
        });
        if (!created) await g.update(profileData);
        console.log(
          `✅ Guider profile ${created ? "created" : "updated"} for ${user.email}`
        );

        await IdCard.findOrCreate({
          where: { userId: user.id, role: "GUIDER" },
          defaults: {
            userId: user.id,
            role: "GUIDER",
            cardNumber: generateCardNumber("GUIDER"),
            fullName: profileData.fullName,
            companyName: profileData.companyName,
            location: profileData.location,
            placeIds: profileData.placeIds,
            placeNames,
            profileImage: profileData.profilePhotoUrl,
            issueDate: new Date(),
            expiryDate: new Date(
              new Date().setFullYear(new Date().getFullYear() + 1)
            ),
            status: "ACTIVE",
          },
        });
      } else if (user.role === "PHOTOGRAPHER") {
        const [p, created] = await Photographer.findOrCreate({
          where: { userId: user.id },
          defaults: profileData,
        });
        if (!created) await p.update(profileData);
        console.log(
          `✅ Photographer profile ${created ? "created" : "updated"} for ${user.email}`
        );

        await IdCard.findOrCreate({
          where: { userId: user.id, role: "PHOTOGRAPHER" },
          defaults: {
            userId: user.id,
            role: "PHOTOGRAPHER",
            cardNumber: generateCardNumber("PHOTOGRAPHER"),
            fullName: profileData.fullName,
            companyName: profileData.companyName,
            location: profileData.location,
            placeIds: profileData.placeIds,
            placeNames,
            profileImage: profileData.profilePhotoUrl,
            issueDate: new Date(),
            expiryDate: new Date(
              new Date().setFullYear(new Date().getFullYear() + 1)
            ),
            status: "ACTIVE",
          },
        });
      }
    }

    console.log("\n✅ Backfill complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

run();