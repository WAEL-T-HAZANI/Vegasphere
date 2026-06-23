const { ApiError } = require("../../services/http-error.js");
const User = require("../../models/User.js");
const {
  getVapidPublicKey,
  isPushConfigured,
  notifyUserPush,
} = require("../../services/push-notify.js");

const getVapidPublicKeyHandler = (req, res) => {
  const key = getVapidPublicKey();
  if (!key) {
    throw ApiError.serviceUnavailable("Web Push not configured");
  }
  res.json({ publicKey: key });
};

const subscribePush = async (req, res) => {
    const { endpoint, keys } = req.body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw ApiError.badRequest("Invalid subscription");
    }
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { pushSubscriptions: { endpoint } },
    });
    await User.findByIdAndUpdate(req.user.id, {
      $push: {
        pushSubscriptions: {
          endpoint,
          keys: { p256dh: keys.p256dh, auth: keys.auth },
        },
      },
    });
    res.json({ ok: true });
  
};

const unsubscribePush = async (req, res) => {
    const { endpoint } = req.body || {};
    if (!endpoint) {
      throw ApiError.badRequest("endpoint required");
    }
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { pushSubscriptions: { endpoint } },
    });
    res.json({ ok: true });
};

const sendTestPush = async (req, res) => {
  if (!isPushConfigured()) {
    throw ApiError.serviceUnavailable("Web Push not configured");
  }
  const user = await User.findById(req.user.id).select("pushSubscriptions");
  if (!user?.pushSubscriptions?.length) {
    throw ApiError.badRequest("No push subscription — enable Web Push in Settings first");
  }
  await notifyUserPush(req.user.id, {
    title: "Vegasphere",
    body: "Test notification — your alerts are working.",
    tag: "vegasphere-test",
    category: "direct",
    data: { url: "/settings" },
  });
  res.json({ ok: true });
};

module.exports = {
  getVapidPublicKeyHandler,
  subscribePush,
  unsubscribePush,
  sendTestPush,
};
