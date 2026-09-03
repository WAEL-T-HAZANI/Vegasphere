/** Wipe DB and seed rich bilingual demo data (Arabic + English). */
const crypto = require("crypto");
const { hashSecret } = require("./password-hash.js");
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
  { key: "ahmed", name: "Ahmed Hassan", email: "ahmed@demo.vegasphere.test", username: "ahmed_dev", about: "Full-stack developer from Cairo. React, Node, MongoDB.", lang: "ar", skills: ["javascript", "react", "nodejs"], interests: ["open-source", "ai", "coffee"], online: true },
  { key: "sarah", name: "Sarah Mitchell", email: "sarah@demo.vegasphere.test", username: "sarah_ux", about: "UX designer crafting calm, accessible chat experiences.", lang: "en", skills: ["figma", "ux", "accessibility"], interests: ["design-systems", "typography"], online: true },
  { key: "layla", name: "Layla Al-Rashid", email: "layla@demo.vegasphere.test", username: "layla_market", about: "Growth marketer | Bilingual EN/AR | Dubai-based.", lang: "ar", skills: ["marketing", "content", "analytics"], interests: ["branding", "startups"], online: false },
  { key: "james", name: "James Cooper", email: "james@demo.vegasphere.test", username: "james_founder", about: "Building Vegasphere. Always hiring curious builders.", lang: "en", skills: ["product", "fundraising", "leadership"], interests: ["saas", "networking"], online: true },
  { key: "omar", name: "Omar Khalil", email: "omar@demo.vegasphere.test", username: "omar_photo", about: "Street photographer. Amman → everywhere.", lang: "ar", skills: ["photography", "lightroom", "storytelling"], interests: ["travel", "architecture"], online: false },
  { key: "emma", name: "Emma Williams", email: "emma@demo.vegasphere.test", username: "emma_teacher", about: "English teacher & language exchange host in London.", lang: "en", skills: ["teaching", "editing", "public-speaking"], interests: ["languages", "books"], online: true },
  { key: "fatima", name: "Fatima Zahra", email: "fatima@demo.vegasphere.test", username: "fatima_study", about: "CS student at Alexandria University. ML enthusiast.", lang: "ar", skills: ["python", "machine-learning", "research"], interests: ["study-groups", "hackathons"], online: false },
  { key: "michael", name: "Michael Brooks", email: "michael@demo.vegasphere.test", username: "mike_engineer", about: "Backend engineer. Distributed systems & databases.", lang: "en", skills: ["golang", "kubernetes", "mongodb"], interests: ["devops", "performance"], online: false },
  { key: "noor", name: "Noor Al-Din", email: "noor@demo.vegasphere.test", username: "noor_chef", about: "Home chef sharing Levantine recipes with friends.", lang: "ar", skills: ["cooking", "food-styling", "video"], interests: ["recipes", "family"], online: true },
  { key: "sofia", name: "Sofia Martinez", email: "sofia@demo.vegasphere.test", username: "sofia_pm", about: "Product manager bridging design & engineering.", lang: "en", skills: ["product", "agile", "user-research"], interests: ["roadmaps", "mentoring"], online: true },
  { key: "yusuf", name: "Yusuf Ibrahim", email: "yusuf@demo.vegasphere.test", username: "yusuf_freelance", about: "Freelance translator EN↔AR. Available for projects.", lang: "ar", skills: ["translation", "localization", "copywriting"], interests: ["media", "podcasts"], online: false },
  { key: "david", name: "David Chen", email: "david@demo.vegasphere.test", username: "david_data", about: "Data analyst turning chat metrics into insights.", lang: "en", skills: ["sql", "python", "visualization"], interests: ["analytics", "dashboards"], online: false },
];

function hoursAgo(h) { return new Date(Date.now() - h * 60 * 60 * 1000); }
function minsAgo(m) { return new Date(Date.now() - m * 60 * 1000); }
function daysFromNow(d) { return new Date(Date.now() + d * 24 * 60 * 60 * 1000); }

async function wipeDatabase() {
  for (const Model of [User, Conversation, Message, Notification, Status, NetworkingPost, CallInvite, CallLog, UserReport]) {
    await Model.deleteMany({});
  }
  try { await User.db.collection("_vegasphere_health").deleteMany({}); } catch { /* optional */ }
}

async function createUsers() {
  const hashed = await hashSecret(SEED_PASSWORD);
  const users = {};
  for (const def of USER_DEFS) {
    users[def.key] = await User.create({
      name: def.name, email: def.email, username: def.username, password: hashed,
      emailVerified: true, about: def.about,
      networkingHeadline: def.lang === "ar" ? `${def.name.split(" ")[0]} — ${def.skills.slice(0, 2).join(" & ")}` : `${def.skills[0]} · ${def.interests[0]}`,
      networkingSkills: def.skills, networkingInterests: def.interests,
      networkingLookingFor: def.lang === "ar" ? "أبحث عن تعاون حقيقي ومشاريع ذات معنى" : "Open to meaningful collabs and side projects",
      networkingOpenToCollaborate: true, isOnline: def.online,
      lastSeen: def.online ? new Date() : hoursAgo(3 + Math.random() * 20),
    });
  }
  return users;
}

async function addMessages(conversation, entries, users) {
  let seq = conversation.msgSeq || 0;
  const created = [];
  for (const entry of entries) {
    seq += 1;
    const sender = users[entry.from];
    const at = entry.at || minsAgo(entry.minsAgo ?? 60);
    created.push(await Message.create({
      conversationId: conversation._id, senderId: sender._id, seq,
      messageType: entry.type || "text", text: entry.text || "",
      poll: entry.poll || undefined, reactions: entry.reactions || [],
      isPinned: entry.pinned || false,
      mentionedUserIds: (entry.mentions || []).map((k) => users[k]._id),
      createdAt: at, updatedAt: at,
      seenBy: (entry.seenBy || []).map((k) => ({ user: users[k]._id, seenAt: at })),
      deliveredTo: (entry.deliveredTo || entry.seenBy || []).map((k) => ({ user: users[k]._id, deliveredAt: at })),
    }));
  }
  const last = created[created.length - 1];
  await Conversation.findByIdAndUpdate(conversation._id, {
    msgSeq: seq, latestMessage: last?.text?.slice(0, 120) || "", updatedAt: last?.createdAt || new Date(),
  });
  return created;
}

async function seedConversations(users) {
  const convos = {};
  convos.ahmedSarah = await Conversation.create({ members: [users.ahmed._id, users.sarah._id], unreadCounts: [{ userId: users.sarah._id, count: 2 }] });
  await addMessages(convos.ahmedSarah, [
    { from: "sarah", text: "Hey Ahmed! Did you review the new chat bubble spacing?", minsAgo: 180, seenBy: ["ahmed", "sarah"] },
    { from: "ahmed", text: "Yes — looks much cleaner on mobile. شكراً on the RTL fixes too 🙌", minsAgo: 175, seenBy: ["ahmed", "sarah"] },
    { from: "sarah", text: "Perfect. Can we ship the dark-mode tokens tomorrow?", minsAgo: 120, seenBy: ["ahmed", "sarah"] },
    { from: "ahmed", text: "أكيد، بجهّز PR الليلة. I'll ping you before merge.", minsAgo: 90, seenBy: ["ahmed"] },
    { from: "sarah", text: "Also — users asked for bigger tap targets in the reaction bar.", minsAgo: 15 },
    { from: "sarah", text: "I dropped a Figma link in the team channel.", minsAgo: 12 },
  ], users);

  convos.laylaJames = await Conversation.create({ members: [users.layla._id, users.james._id], unreadCounts: [{ userId: users.james._id, count: 1 }] });
  await addMessages(convos.laylaJames, [
    { from: "james", text: "Layla, the investor deck needs a sharper traction slide.", minsAgo: 300, seenBy: ["layla", "james"] },
    { from: "layla", text: "On it. I'll highlight WAU growth and retention cohorts.", minsAgo: 280, seenBy: ["layla", "james"] },
    { from: "james", text: "Great. Mention the bilingual onboarding — it's our edge.", minsAgo: 240, seenBy: ["layla", "james"] },
    { from: "layla", text: "Added a case study: Arabic-first users invite 2.3× more contacts.", minsAgo: 60, seenBy: ["layla"] },
  ], users);

  convos.omarEmma = await Conversation.create({ members: [users.omar._id, users.emma._id] });
  await addMessages(convos.omarEmma, [
    { from: "emma", text: "Omar, your Petra photo series is stunning!", minsAgo: 400, seenBy: ["omar", "emma"] },
    { from: "omar", text: "Thank you Emma 🙏 الصورة الثالثة أخذتها عند الفجر.", minsAgo: 390, seenBy: ["omar", "emma"] },
    { from: "emma", text: "Could you caption the set in English for my students?", minsAgo: 360, seenBy: ["omar", "emma"] },
    { from: "omar", text: "Happy to! I'll send drafts tonight.", minsAgo: 200, seenBy: ["omar", "emma"] },
  ], users);

  convos.fatimaMichael = await Conversation.create({ members: [users.fatima._id, users.michael._id], unreadCounts: [{ userId: users.michael._id, count: 3 }] });
  await addMessages(convos.fatimaMichael, [
    { from: "fatima", text: "مرحباً مايكل، هل جهّزت ملخص محاضرة الخوارزميات؟", minsAgo: 500, seenBy: ["fatima", "michael"] },
    { from: "michael", text: "Not yet — still wrestling with the graph traversal proofs.", minsAgo: 480, seenBy: ["fatima", "michael"] },
    { from: "fatima", text: "أرسلت لك ملف PDF بالعربي والإنجليزي. راجع الفصل الرابع.", minsAgo: 450, seenBy: ["fatima", "michael"] },
    { from: "fatima", text: "نلتقي غداً الساعة 6 مساءً على Discord؟", minsAgo: 30, seenBy: ["fatima"] },
    { from: "fatima", text: "جهّز أسئلة الامتحان التجريبي لو سمحت.", minsAgo: 25, seenBy: ["fatima"] },
  ], users);

  convos.cookingGroup = await Conversation.create({
    isGroup: true, name: "مطبخ Levant", description: "وصفات، نصائح، وتحديات طبخ أسبوعية 🍽️",
    members: [users.noor._id, users.fatima._id, users.layla._id, users.yusuf._id, users.ahmed._id],
    admins: [users.noor._id], unreadCounts: [{ userId: users.fatima._id, count: 5 }],
  });
  await addMessages(convos.cookingGroup, [
    { from: "noor", text: "أهلاً بالجميع! تحدي هذا الأسبوع: مسخّن دجاج بثلاث مكوّنات فقط.", minsAgo: 720, pinned: true, seenBy: ["noor", "layla"] },
    { from: "fatima", text: "جربته أمس — أضفت زعتر بريّ ورائع 👌", minsAgo: 600, seenBy: ["noor", "fatima"], reactions: [{ emoji: "😋", users: [users.noor._id] }] },
    { from: "yusuf", text: "أرفقت فيديو قصير للتتبيل. Tell me if the EN subtitles are OK.", minsAgo: 400, seenBy: ["noor", "yusuf"] },
    { from: "layla", text: "Subtitles are perfect! شكراً يوسف", minsAgo: 350, seenBy: ["layla", "noor"] },
    { from: "ahmed", text: "Can we pin a shopping list for Friday's potluck?", minsAgo: 45, seenBy: ["ahmed"] },
  ], users);

  convos.sofiaDavid = await Conversation.create({ members: [users.sofia._id, users.david._id] });
  await addMessages(convos.sofiaDavid, [
    { from: "david", text: "Weekly retention jumped 4.2% after the inbox redesign.", minsAgo: 200, seenBy: ["sofia", "david"] },
    { from: "sofia", text: "Love that. Which cohort drove it — new or returning?", minsAgo: 190, seenBy: ["sofia", "david"] },
    { from: "david", text: "Mostly returning users in MENA timezone.", minsAgo: 180, seenBy: ["sofia", "david"] },
    { from: "sofia", text: "Let's propose a poll feature A/B test for Q4.", minsAgo: 100, seenBy: ["sofia", "david"] },
    { from: "david", text: "", minsAgo: 95, seenBy: ["sofia", "david"], poll: { question: "Which poll UI should we prototype first?", allowsMultiple: false, options: [{ id: "a", text: "Inline bubble poll", voterIds: [users.sofia._id] }, { id: "b", text: "Full-screen modal poll", voterIds: [users.david._id] }, { id: "c", text: "Thread-attached poll", voterIds: [] }] } },
  ], users);

  convos.yusufSelf = await Conversation.create({ isSelfChat: true, members: [users.yusuf._id] });
  await addMessages(convos.yusufSelf, [
    { from: "yusuf", text: "أفكار مشروع: قاموس slang عربي-إنجليزي للشات", minsAgo: 1000, seenBy: ["yusuf"] },
    { from: "yusuf", text: "Invoice #104 — Client: Layla, due Friday", minsAgo: 800, seenBy: ["yusuf"] },
    { from: "yusuf", text: "Remember: tone guide — warm MSA, not overly formal", minsAgo: 50, seenBy: ["yusuf"] },
  ], users);

  convos.techChannelEn = await Conversation.create({
    isChannel: true, channelSlug: "tech-digest-en", name: "Tech Digest EN", description: "Daily engineering notes.",
    visibility: "public", members: [users.james._id, users.michael._id, users.ahmed._id, users.sofia._id, users.david._id, users.sarah._id],
    admins: [users.james._id, users.michael._id], channelPostingMode: "admins_only",
  });
  await addMessages(convos.techChannelEn, [
    { from: "james", text: "🚀 v2.4 shipped: message threads, scheduled send, and poll messages.", minsAgo: 1440, pinned: true, seenBy: ["james", "michael"] },
    { from: "michael", text: "MongoDB index migration completed — p95 message fetch down 38%.", minsAgo: 1200, seenBy: ["michael", "david"] },
    { from: "ahmed", text: "RTL regression tests are green across Safari + Chrome Android.", minsAgo: 600, seenBy: ["ahmed", "sarah"] },
  ], users);

  convos.techChannelAr = await Conversation.create({
    isChannel: true, channelSlug: "akhbar-tech-ar", name: "أخبار التقنية", description: "تحديثات يومية للفريق العربي.",
    visibility: "public", members: [users.ahmed._id, users.layla._id, users.fatima._id, users.noor._id, users.yusuf._id],
    admins: [users.ahmed._id], channelPostingMode: "admins_only",
  });
  await addMessages(convos.techChannelAr, [
    { from: "ahmed", text: "📢 تم إطلاق دعم الخطوط العربية المحسّنة في iOS.", minsAgo: 900, pinned: true, seenBy: ["ahmed", "fatima"] },
    { from: "ahmed", text: "تذكير: اختبروا إرسال الرسائل الصوتية على شبكة 3G بطيئة.", minsAgo: 300, seenBy: ["ahmed", "yusuf"] },
    { from: "fatima", text: "جربت — التحميل التدريجي يعمل بشكل ممتاز 👍", minsAgo: 250, seenBy: ["fatima", "ahmed"] },
  ], users);

  convos.teamGroup = await Conversation.create({
    isGroup: true, name: "Vegasphere Core Team", description: "Daily standups · EN/AR welcome · 🌍",
    members: [users.james._id, users.sarah._id, users.ahmed._id, users.sofia._id, users.michael._id, users.layla._id],
    admins: [users.james._id, users.sofia._id],
  });
  await addMessages(convos.teamGroup, [
    { from: "james", text: "Standup in 10 — async updates welcome.", minsAgo: 60, seenBy: ["james", "sarah", "ahmed"], mentions: ["sarah", "ahmed"] },
    { from: "sarah", text: "Design: finishing reaction picker accessibility audit today.", minsAgo: 55, seenBy: ["james", "sarah"] },
    { from: "ahmed", text: "Backend: merging typing-indicator debounce fix. جاهز للمراجعة.", minsAgo: 50, seenBy: ["james", "ahmed"] },
    { from: "layla", text: "Marketing: Arabic launch blog post goes live at 5pm Dubai.", minsAgo: 40, seenBy: ["layla", "james"] },
    { from: "michael", text: "Heads up — Redis failover drill tonight 02:00 UTC.", minsAgo: 20, seenBy: ["michael", "james"] },
  ], users);

  convos.emmaFatima = await Conversation.create({ members: [users.emma._id, users.fatima._id] });
  await addMessages(convos.emmaFatima, [
    { from: "emma", text: "Fatima, let's practice interview questions today!", minsAgo: 150, seenBy: ["emma", "fatima"] },
    { from: "fatima", text: "Great idea! ابدأي بالسؤال الأول — I'll answer in English first.", minsAgo: 140, seenBy: ["emma", "fatima"] },
    { from: "emma", text: "Tell me about a challenging bug you fixed recently.", minsAgo: 130, seenBy: ["emma", "fatima"] },
    { from: "fatima", text: "Race condition in message ordering — we fixed it with monotonic seq counters.", minsAgo: 120, seenBy: ["emma", "fatima"] },
  ], users);

  convos.omarNoor = await Conversation.create({ members: [users.omar._id, users.noor._id] });
  await addMessages(convos.omarNoor, [
    { from: "noor", text: "عمر، ممكن تصوّر سلسلة وصفات الشتاء؟ الإضاءة الدافئة مهمة.", minsAgo: 220, seenBy: ["omar", "noor"] },
    { from: "omar", text: "Absolutely — I'll bring the 35mm lens for that cozy kitchen vibe.", minsAgo: 210, seenBy: ["omar", "noor"] },
    { from: "noor", text: "ممتاز! الجلسة يوم السبت 11 صباحاً.", minsAgo: 200, seenBy: ["omar", "noor"] },
  ], users);

  return convos;
}

async function seedExtras(users, convos) {
  const expires = daysFromNow(1);
  await Status.create([
    { userId: users.sarah._id, text: "Polishing pixels ✨", expiresAt: expires },
    { userId: users.ahmed._id, text: "قهوة + كود ☕", expiresAt: expires, reactions: [{ emoji: "🔥", userId: users.james._id }] },
    { userId: users.noor._id, text: "تحضير مسخّن للعشاء 🍗", expiresAt: expires },
    { userId: users.james._id, text: "Investor calls all day — async only", expiresAt: expires },
    { userId: users.omar._id, text: "Golden hour in Amman 📸", expiresAt: expires },
  ]);
  await NetworkingPost.create([
    { authorId: users.james._id, title: "Looking for bilingual community moderator", summary: "Help us grow Arabic-first user groups.", tags: ["community", "arabic"], roleNeeded: "Community moderator", interestedUserIds: [users.layla._id] },
    { authorId: users.sofia._id, title: "Beta testers for poll messages", summary: "Need power users to stress-test polls.", tags: ["beta", "product"], roleNeeded: "Beta tester", interestedUserIds: [users.fatima._id] },
    { authorId: users.ahmed._id, title: "Open-source RTL component library", summary: "Shared React primitives for Arabic chat UIs.", tags: ["opensource", "react"], roleNeeded: "Frontend developer", interestedUserIds: [users.sarah._id] },
    { authorId: users.noor._id, title: "Food × photography series", summary: "Recipe reels with cinematic stills.", tags: ["food", "photography"], roleNeeded: "Photographer", interestedUserIds: [users.omar._id] },
  ]);
  await Notification.create([
    { recipientId: users.sarah._id, actorId: users.ahmed._id, type: "mention", data: { status: "pending", conversationId: convos.teamGroup._id, conversationName: "Vegasphere Core Team", preview: "Backend: merging typing-indicator debounce fix." } },
    { recipientId: users.michael._id, actorId: users.fatima._id, type: "mention", data: { status: "pending", conversationId: convos.fatimaMichael._id, preview: "نلتقي غداً الساعة 6 مساءً على Discord؟" } },
    { recipientId: users.emma._id, actorId: users.omar._id, type: "chat_invite", data: { status: "pending", preview: "Voice note language exchange?" } },
  ]);
  const token = crypto.randomBytes(16).toString("hex");
  const invite = await CallInvite.create({ token, conversationId: convos.ahmedSarah._id, creatorId: users.sarah._id, mode: "video", title: "Design review", scheduledFor: daysFromNow(1), isActive: true });
  await Notification.create({ recipientId: users.ahmed._id, actorId: users.sarah._id, type: "call_invite", data: { status: "pending", conversationId: convos.ahmedSarah._id, callInviteId: invite._id, callToken: token, callMode: "video", callTitle: "Design review", scheduledFor: invite.scheduledFor } });
  await CallLog.create([
    { sessionId: `seed-${crypto.randomBytes(8).toString("hex")}`, conversationId: convos.laylaJames._id, initiatorId: users.james._id, participantIds: [users.james._id, users.layla._id], mode: "audio", status: "completed", answeredAt: hoursAgo(48), answeredByIds: [users.layla._id], endedAt: hoursAgo(48), durationSec: 1240 },
    { sessionId: `seed-${crypto.randomBytes(8).toString("hex")}`, conversationId: convos.cookingGroup._id, initiatorId: users.noor._id, participantIds: [users.noor._id, users.fatima._id, users.layla._id], mode: "video", groupCall: true, status: "missed", endedAt: hoursAgo(12), durationSec: 0 },
  ]);
}

async function runSeedRichDemo() {
  await wipeDatabase();
  const users = await createUsers();
  const convos = await seedConversations(users);
  await seedExtras(users, convos);
  return {
    password: SEED_PASSWORD,
    users: await User.countDocuments(),
    conversations: await Conversation.countDocuments(),
    messages: await Message.countDocuments(),
    notifications: await Notification.countDocuments(),
    statuses: await Status.countDocuments(),
    networkingPosts: await NetworkingPost.countDocuments(),
    callInvites: await CallInvite.countDocuments(),
    callLogs: await CallLog.countDocuments(),
    sampleLogin: { email: "ahmed@demo.vegasphere.test", password: SEED_PASSWORD },
  };
}

module.exports = { runSeedRichDemo, SEED_PASSWORD };
