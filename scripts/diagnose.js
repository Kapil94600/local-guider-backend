// scripts/diagnose.js
import { sequelize } from "../src/config/database.js";
import { User, Place, Guider, Photographer } from "../src/database/models/index.js";

async function diagnose() {
  await sequelize.authenticate();
  console.log("DB connected\n");

  console.log("========== USERS ==========");
  const users = await User.findAll();
  let brokenUsers = 0;
  for (const u of users) {
    const img = u.profileImage;
    let status = "OK";
    if (!img) status = "NULL";
    else if (img.includes("/uploads/")) status = "BROKEN-LOCAL";
    else if (img.includes("res.cloudinary.com")) status = "CLOUDINARY";
    else if (img.startsWith("http")) status = "EXTERNAL";

    if (status === "NULL" || status === "BROKEN-LOCAL") brokenUsers++;
    console.log("  " + u.id.slice(0,8) + " | " + (u.email || "") + " | " + status + " | " + (img || "").slice(0, 70));
  }
  console.log("\n  Total: " + users.length + " | Broken: " + brokenUsers);

  console.log("\n========== PLACES ==========");
  const places = await Place.findAll();
  let brokenPlaces = 0;
  for (const p of places) {
    const img = p.image;
    let status = "OK";
    if (!img) status = "NULL";
    else if (img.includes("/uploads/")) status = "BROKEN-LOCAL";
    else if (img.includes("res.cloudinary.com")) status = "CLOUDINARY";
    else if (img.startsWith("http")) status = "EXTERNAL";

    const gal = Array.isArray(p.gallery) ? p.gallery : [];
    const galBroken = gal.filter(g => g && g.includes("/uploads/")).length;

    if (status === "NULL" || status === "BROKEN-LOCAL" || galBroken > 0) brokenPlaces++;
    console.log("  " + p.id.slice(0,8) + " | " + p.name + " | img:" + status + " | gallery:" + gal.length + " (" + galBroken + " broken)");
  }
  console.log("\n  Total: " + places.length + " | Broken: " + brokenPlaces);

  console.log("\n========== GUIDERS ==========");
  const guiders = await Guider.findAll();
  let brokenG = 0;
  for (const g of guiders) {
    const prof = g.profilePhotoUrl;
    const gal = Array.isArray(g.gallery) ? g.gallery : [];
    const galBroken = gal.filter(x => x && x.includes("/uploads/")).length;
    let status = !prof ? "NULL" : prof.includes("/uploads/") ? "BROKEN" : prof.includes("cloudinary") ? "CLOUD" : "OTHER";
    if (status === "NULL" || status === "BROKEN" || galBroken > 0) brokenG++;
    console.log("  " + g.id.slice(0,8) + " | prof:" + status + " | gallery:" + gal.length + " (" + galBroken + ")");
  }
  console.log("\n  Total: " + guiders.length + " | Broken: " + brokenG);

  console.log("\n========== PHOTOGRAPHERS ==========");
  const photos = await Photographer.findAll();
  let brokenP = 0;
  for (const p of photos) {
    const prof = p.profilePhotoUrl;
    const gal = Array.isArray(p.gallery) ? p.gallery : [];
    const galBroken = gal.filter(x => x && x.includes("/uploads/")).length;
    let status = !prof ? "NULL" : prof.includes("/uploads/") ? "BROKEN" : prof.includes("cloudinary") ? "CLOUD" : "OTHER";
    if (status === "NULL" || status === "BROKEN" || galBroken > 0) brokenP++;
    console.log("  " + p.id.slice(0,8) + " | prof:" + status + " | gallery:" + gal.length + " (" + galBroken + ")");
  }
  console.log("\n  Total: " + photos.length + " | Broken: " + brokenP);

  console.log("\n========== SUMMARY ==========");
  console.log("Users broken: " + brokenUsers + "/" + users.length);
  console.log("Places broken: " + brokenPlaces + "/" + places.length);
  console.log("Guiders broken: " + brokenG + "/" + guiders.length);
  console.log("Photographers broken: " + brokenP + "/" + photos.length);

  process.exit(0);
}

diagnose().catch(e => { console.error(e); process.exit(1); });
