/**
 * Send a test DM from Oliver Bauer (or another user) for smart-reply testing.
 *
 * Usage:
 *   node scripts/send-test-incoming.js
 *   node scripts/send-test-incoming.js "how are you"
 *   node scripts/send-test-incoming.js "thanks" --to liam4@seed.vegasphere.test
 */
require("dotenv").config({
  path: require("path").resolve(__dirname, "..", ".env"),
  override: true,
});

const connectDB = require("../database.js");
const User = require("../models/User.js");
const Conversation = require("../models/Conversation.js");
const { sendMessageHandler } = require("../controllers/messages/send.service.js");
const { getIO } = require("../socket/index.js");

const DEFAULT_TEXT = "how are you";
const FROM_NAME = "oliver bauer";

function parseArgs(argv) {
  const args = argv.slice(2);
  let text = DEFAULT_TEXT;
  let toEmail = null;
  const positional = [];

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--to" && args[i + 1]) {
      toEmail = args[i + 1].trim().toLowerCase();
      i += 1;
      continue;
    }
    positional.push(args[i]);
  }

  if (positional[0]) text = positional.join(" ");
  return { text, toEmail };
}

async function findUserByName(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;

  const rx = new RegExp(parts.join("|"), "i");
  const hits = await User.find({
    $or: [
      { name: rx },
      { username: rx },
      { email: rx },
    ],
  }).limit(10);

  if (!hits.length) return null;

  const exact = hits.find((u) =>
    String(u.name || "").toLowerCase().includes(FROM_NAME),
  );
  return exact || hits[0];
}

async function findDmConversation(userAId, userBId) {
  const a = userAId.toString();
  const b = userBId.toString();
  const hits = await Conversation.find({
    members: { $all: [a, b], $size: 2 },
    isGroup: { $ne: true },
    isChannel: { $ne: true },
  }).sort({ createdAt: 1 });

  return hits[0] || null;
}

async function main() {
  const { text, toEmail } = parseArgs(process.argv);

  await connectDB();

  const sender = await findUserByName(FROM_NAME);
  if (!sender) {
    console.error(`Could not find user matching "${FROM_NAME}".`);
    process.exit(1);
  }

  let receiver = null;
  if (toEmail) {
    receiver = await User.findOne({ email: toEmail });
  } else {
    const candidates = await User.find({ _id: { $ne: sender._id } }).limit(20);
    receiver = candidates[0] || null;
  }

  if (!receiver) {
    console.error("Could not find receiver user. Pass --to email@example.com");
    process.exit(1);
  }

  let conversation = await findDmConversation(sender._id, receiver._id);
  if (!conversation) {
    conversation = await Conversation.create({
      members: [sender._id, receiver._id],
      createdBy: sender._id,
    });
    console.log("Created new DM conversation:", conversation._id.toString());
  } else {
    console.log("Using existing conversation:", conversation._id.toString());
  }

  const result = await sendMessageHandler({
    text,
    messageType: "text",
    senderId: sender._id,
    conversationId: conversation._id,
    receiverId: receiver._id,
    isReceiverInsideChatRoom: false,
    otherMemberIds: [receiver._id.toString()],
    inRoomUserIds: [],
  });

  if (!result.ok) {
    console.error("Send failed:", result.error);
    process.exit(1);
  }

  const io = getIO?.();
  if (io) {
    io.to(`user:${receiver._id.toString()}`).emit("message:new", {
      message: result.message,
      conversationId: conversation._id.toString(),
    });
  }

  console.log(
    `Sent from ${sender.name || sender.email} -> ${receiver.name || receiver.email}`,
  );
  console.log("Text:", text);
  console.log("Conversation:", conversation._id.toString());
  console.log("Open that chat in the app — smart reply chips should appear.");

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
