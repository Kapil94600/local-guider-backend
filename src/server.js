import { server } from "./socket.js";
import { env } from "./config/env.js";
import { connectDB, sequelize } from "./config/database.js";
import "./database/models/index.js";
import { startCronJobs } from "./config/cron.js";

const startServer = async () => {
  try {
    console.log("1️⃣ Connecting to DB...");
    await connectDB();
    console.log("2️⃣ DB Connected");

    console.log("3️⃣ Syncing tables...");
    await sequelize.sync({ alter: true }); // ✅ TEMP: Naye columns add honge
    console.log("4️⃣ Tables Synced");

    console.log("5️⃣ Starting Cron Jobs...");
    startCronJobs();

    console.log("6️⃣ Starting server...");
    server.listen(env.PORT, () => {
      console.log(`🚀 Local Guider API Running On Port ${env.PORT}`);
    });
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

const shutdown = () => {
  console.log("🔴 Shutting down gracefully...");
  server.close(async () => {
    await sequelize.close();
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

startServer();