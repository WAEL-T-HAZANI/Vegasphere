/**
 * Wipe DB and seed bilingual demo data.
 *
 * Belmo: auto-runs on deploy when PUBLIC_API_URL contains onbelmo.uk.
 * Manual: node scripts/seed-rich-demo.js
 * Disable auto-seed on Belmo: SEED_DEMO_ON_START=0
 */
require("dotenv").config({
  path: require("path").resolve(__dirname, "..", ".env"),
  override: false,
});

const crypto = require("crypto");
const connectDB = require("../database.js");
const { hashSecret } = require("../services/password-hash.js");
const User = require("../models/User.js");
const Conversation = require("../models/Conversation.js");
const Message = require("../models/Message.js");
const Notification = require("../models/Notification.js");
const Status = require("../models/Status.js");
const NetworkingPost = require("../models/NetworkingPost.js");
const CallInvite = require("../models/CallInvite.js");
const CallLog = require("../models/CallLog.js");
const UserReport = require("../models/UserReport.js");

const SEED_PASSWORD = "Demo1234!";

const USER_DEFS = [
  { key: "ahmed", name: "Ahmed Hassan", email: "ahmed@demo.vegasphere.test", username: "ahmed_dev", about: "Full-stack developer from Cairo.", lang: "ar", skills: ["javascript", "react"], online: true },
  { key: "sarah", name: "Sarah Mitchell", email: "sarah@demo.vegasphere.test", username: "sarah_ux", about: "UX designer.", lang: "en", skills: ["figma", "ux"], online: true },
  { key: "layla", name: "Layla Al-Rashid", email: "layla@demo.vegasphere.test", username: "layla_market", about: "Growth marketer EN/AR.", lang: "ar", skills: ["marketing"], online: false },
  { key: "james", name: "James Cooper", email: "james@demo.vegasphere.test", username: "james_founder", about: "Building Vegasphere.", lang: "en", skills: ["product"], online: true },
  { key: "omar", name: "Omar Khalil", email: "omar@demo.vegasphere.test", username: "omar_photo", about: "Street photographer.", lang: "ar", skills: ["photography"], online: false },
  { key: "emma", name: "Emma Williams", email: "emma@demo.vegasphere.test", username: "emma_teacher", about: "English teacher.", lang: "en", skills: ["teaching"], online: true },
  { key: "fatima", name: "Fatima Zahra", email: "fatima@demo.vegasphere.test", username: "fatima_study", about: "CS student.", lang: "ar", skills: ["python"], online: false },
  { key: "michael", name: "Michael Brooks", email: "michael@demo.vegasphere.test", username: "mike_engineer", about: "Backend engineer.", lang: "en", skills: ["golang"], online: false },
  { key: "noor", name: "Noor Al-Din", email: "noor@demo.vegasphere.test", username: "noor_chef", about: "Home chef.", lang: "ar", skills: ["cooking"], online: true },
  { key: "sofia", name: "Sofia Martinez", email: "sofia@demo.vegasphere.test", username: "sofia_pm", about: "Product manager.", lang: "en", skills: ["product"], online: true },
  { key: "yusuf", name: "Yusuf Ibrahim", email: "yusuf@demo.vegasphere.test", username: "yusuf_freelance", about: "Translator EN↔AR.", lang: "ar", skills: ["translation"], online: false },
  { key: "david", name: "David Chen", email: "david@demo.vegasphere.test", username: "david_data", about: "Data analyst.", lang: "en", skills: ["sql"], online: false },
];

const hoursAgo = (h) => new Date(Date.now() - h * 3600000);
const minsAgo = (m) => new Date(Date.now() - m * 60000);
const daysFromNow = (d) => new Date(Date.now() + d * 86400000);

async function wipe() {
  for (const M of [User, Conversation, Message, Notification, Status, NetworkingPost, CallInvite, CallLog, UserReport]) {
    await M.deleteMany({});
  }
  try {
    await User.db.collection("_vegasphere_health").deleteMany({});
  } catch {
    /* optional */
  }
}

async function createUsers() {
  const hashed = await hashSecret(SEED_PASSWORD);
  const users = {};
  for (const d of USER_DEFS) {
    users[d.key] = await User.create({
      name: d.name,
      email: d.email,
      username: d.username,
      password: hashed,
      emailVerified: true,
      about: d.about,
      networkingSkills: d.skills,
      networkingOpenToCollaborate: true,
      isOnline: d.online,
      lastSeen: d.online ? new Date() : hoursAgo(5),
    });
  }
  return users;
}

async function addMsgs(convo, entries, users) {
  let seq = convo.msgSeq || 0;
  for (const e of entries) {
    seq += 1;
    const at = minsAgo(e.m ?? 60);
    await Message.create({
      conversationId: convo._id,
      senderId: users[e.f]._id,
      seq,
      text: e.t,
      createdAt: at,
      updatedAt: at,
      seenBy: (e.s || []).map((k) => ({ user: users[k]._id, seenAt: at })),
    });
  }
  await Conversation.findByIdAndUpdate(convo._id, {
    msgSeq: seq,
    latestMessage: entries.at(-1).t.slice(0, 120),
    updatedAt: new Date(),
  });
}

async function seed(users) {
  const c1 = await Conversation.create({ members: [users.ahmed._id, users.sarah._id] });
  await addMsgs(c1, [
    { f: "sarah", t: "Hey Ahmed! Did you review the new chat bubble spacing?", m: 180, s: ["ahmed", "sarah"] },
    { f: "ahmed", t: "Yes — looks much cleaner on mobile. شكراً on the RTL fixes too 🙌", m: 175, s: ["ahmed", "sarah"] },
    { f: "sarah", t: "Perfect. Can we ship the dark-mode tokens tomorrow?", m: 120, s: ["ahmed", "sarah"] },
    { f: "ahmed", t: "أكيد، بجهّز PR الليلة.", m: 90, s: ["ahmed"] },
  ], users);

  const c2 = await Conversation.create({ members: [users.fatima._id, users.michael._id] });
  await addMsgs(c2, [
    { f: "fatima", t: "مرحباً مايكل، هل جهّزت ملخص محاضرة الخوارزميات؟", m: 500, s: ["fatima", "michael"] },
    { f: "michael", t: "Not yet — still wrestling with the graph traversal proofs.", m: 480, s: ["fatima", "michael"] },
    { f: "fatima", t: "نلتقي غداً الساعة 6 مساءً على Discord؟", m: 30, s: ["fatima"] },
  ], users);

  const g1 = await Conversation.create({
    isGroup: true,
    name: "مطبخ Levant",
    members: [users.noor._id, users.fatima._id, users.layla._id, users.ahmed._id],
    admins: [users.noor._id],
  });
  await addMsgs(g1, [
    { f: "noor", t: "أهلاً بالجميع! تحدي هذا الأسبوع: مسخّن دجاج.", m: 720, s: ["noor"] },
    { f: "fatima", t: "جربته أمس — رائع 👌", m: 600, s: ["noor", "fatima"] },
    { f: "ahmed", t: "Can we pin a shopping list for Friday?", m: 45, s: ["ahmed"] },
  ], users);

  const ch = await Conversation.create({
    isChannel: true,
    channelSlug: "tech-digest-en",
    name: "Tech Digest EN",
    visibility: "public",
    members: [users.james._id, users.michael._id, users.ahmed._id],
    admins: [users.james._id],
    channelPostingMode: "admins_only",
  });
  await addMsgs(ch, [{ f: "james", t: "🚀 v2.4 shipped: threads, scheduled send, polls.", m: 1440, s: ["james"] }], users);

  const team = await Conversation.create({
    isGroup: true,
    name: "Vegasphere Core Team",
    members: [users.james._id, users.sarah._id, users.ahmed._id, users.sofia._id, users.michael._id, users.layla._id],
    admins: [users.james._id],
  });
  await addMsgs(team, [
    { f: "james", t: "Standup in 10 — async updates welcome.", m: 60, s: ["james", "sarah"] },
    { f: "ahmed", t: "Backend: merging typing fix. جاهز للمراجعة.", m: 50, s: ["james", "ahmed"] },
    { f: "layla", t: "Marketing: Arabic launch blog post at 5pm Dubai.", m: 40, s: ["layla"] },
  ], users);

  await Status.create([
    { userId: users.sarah._id, text: "Polishing pixels ✨", expiresAt: daysFromNow(1) },
    { userId: users.ahmed._id, text: "قهوة + كود ☕", expiresAt: daysFromNow(1) },
  ]);
  await NetworkingPost.create([
    { authorId: users.james._id, title: "Looking for bilingual moderator", summary: "Help grow Arabic-first groups.", tags: ["community"], roleNeeded: "Moderator" },
  ]);
  await Notification.create([
    { recipientId: users.sarah._id, actorId: users.ahmed._id, type: "mention", data: { status: "pending", conversationId: team._id, preview: "Backend: merging typing fix." } },
  ]);
  const token = crypto.randomBytes(16).toString("hex");
  await CallInvite.create({
    token,
    conversationId: c1._id,
    creatorId: users.sarah._id,
    mode: "video",
    title: "Design review",
    scheduledFor: daysFromNow(1),
    isActive: true,
  });
  await CallLog.create([{
    sessionId: `seed-${crypto.randomBytes(8).toString("hex")}`,
    conversationId: c1._id,
    initiatorId: users.james._id,
    participantIds: [users.james._id, users.layla._id],
    mode: "audio",
    status: "completed",
    durationSec: 600,
  }]);
}

async function runSeedRichDemo() {
  console.log("[seed] Target DB:", process.env.MONGO_DB_NAME || "(from URI)");
  console.log("[seed] Wiping...");
  await wipe();
  console.log("[seed] Seeding users...");
  const users = await createUsers();
  console.log("[seed] Seeding chats...");
  await seed(users);
  const counts = {
    users: await User.countDocuments(),
    conversations: await Conversation.countDocuments(),
    messages: await Message.countDocuments(),
  };
  console.log("[seed] Done. Login: ahmed@demo.vegasphere.test /", SEED_PASSWORD);
  console.log("[seed] Counts:", counts);
  return counts;
}

async function main() {
  await connectDB();
  await runSeedRichDemo();
  process.exit(0);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { runSeedRichDemo, SEED_PASSWORD };
