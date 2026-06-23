/**
 * Optional Web Push (VAPID). No-op when VAPID keys are missing.
 * Uses `web-push` if installed: `npm install web-push`.
 */
const User = require("../models/User.js");

let webpush = null;
try {
  webpush = require("web-push");
} catch {
  webpush = null;
}

const publicKey = process.env.VAPID_PUBLIC_KEY || "";
const privateKey = process.env.VAPID_PRIVATE_KEY || "";
const subject = process.env.VAPID_SUBJECT || "mailto:vegasphere@localhost";

if (webpush && publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

function isConfigured() {
  return Boolean(webpush && publicKey && privateKey);
}

/**
 * @param {string} userId
 * @param {{ title?: string, body?: string, tag?: string, data?: object }} payload
 */
async function notifyUserPush(userId, payload) {
  if (!isConfigured() || !userId) return;
  const user = await User.findById(userId).select(
    "pushSubscriptions pushNotificationsEnabled doNotDisturb notificationRules",
  );
  if (!user?.pushSubscriptions?.length) return;
  if (user.pushNotificationsEnabled === false) return;
  if (user.doNotDisturb === true) return;
  const rules = user.notificationRules || {};
  const category = String(payload?.category || "direct");
  const isMention = Boolean(payload?.isMention);
  if (category === "direct" && rules.direct === false) return;
  if (
    (category === "group" || category === "channel") &&
    !isMention &&
    rules.groups === false
  ) {
    return;
  }
  if (
    (category === "group" || category === "channel") &&
    isMention &&
    rules.mentions === false
  ) {
    return;
  }

  const playSound = rules.sound !== false;
  const body = JSON.stringify({
    title: payload.title || "Vegasphere",
    body: payload.body || "New message",
    tag: payload.tag || "vegasphere",
    sound: playSound ? "/sounds/vega-chime.wav" : null,
    playSound,
    data: payload.data || {},
  });

  for (const sub of user.pushSubscriptions) {
    if (!sub?.endpoint) continue;
    try {
      await webpush.sendNotification(sub, body, {
        TTL: 60,
        urgency: "normal",
      });
    } catch (e) {
      const code = e.statusCode;
      if (code === 404 || code === 410) {
        await User.updateOne(
          { _id: userId },
          { $pull: { pushSubscriptions: { endpoint: sub.endpoint } } },
        );
      }
    }
  }
}

module.exports = {
  isPushConfigured: isConfigured,
  getVapidPublicKey: () => publicKey || null,
  notifyUserPush,
};
