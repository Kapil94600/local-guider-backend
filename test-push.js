// test-push.js
import { sendPushNotification } from "./src/modules/notifications/push.service.js";

// ✅ Paste actual userId here (from DB query above)
const userId = "3bf97a8e-1234-5678-9abc-def012345678";

console.log("🚀 Testing push for user:", userId);

sendPushNotification(
  userId,
  "Test Notification",
  "Ye ek test push hai — agar ye mobile pe dikha to push system kaam kar raha hai!",
  { test: true, url: "localguider://notifications" },
  "SYSTEM"
)
  .then((result) => {
    console.log("\n✅ RESULT:", JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ ERROR:", err.message);
    console.error(err.stack);
    process.exit(1);
  });