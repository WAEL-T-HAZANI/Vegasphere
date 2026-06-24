const mongoose = require("mongoose");
const User = require("./models/User.js");

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/vegasphere";

let connecting = null;
let indexesSynced = false;

async function syncUserIndexes() {
  if (indexesSynced || mongoose.connection.readyState !== 1) return;
  indexesSynced = true;
  try {
    await User.syncIndexes();
    console.log("✅ MongoDB user indexes synced");
  } catch (error) {
    console.warn("MongoDB user index sync warning:", error.message);
  }
}

function getMongoState() {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  return {
    ready: mongoose.connection.readyState === 1,
    state: states[mongoose.connection.readyState] || "unknown",
  };
}

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connecting) return connecting;

  connecting = (async () => {
    const autoIndex =
      process.env.MONGO_AUTO_INDEX === "1" ||
      (process.env.MONGO_AUTO_INDEX !== "0" &&
        process.env.NODE_ENV !== "production");

    mongoose.set("autoIndex", Boolean(autoIndex));

    const connection = await mongoose.connect(MONGO_URI, {
      dbName: "vegasphere",
      autoIndex: Boolean(autoIndex),
    });

    console.log(`✅ MongoDB connected: ${connection.connection.host}`);
    await syncUserIndexes();
    connecting = null;
    return connection;
  })().catch((error) => {
    connecting = null;
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });

  return connecting;
};

async function disconnectDB() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.connection.close();
  console.log("MongoDB disconnected");
}

module.exports = connectDB;
module.exports.getMongoState = getMongoState;
module.exports.disconnectDB = disconnectDB;
