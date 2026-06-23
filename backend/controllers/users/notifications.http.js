const { ApiError } = require("../../services/http-error.js");
const Notification = require("../../models/Notification.js");
const {
  emitNotificationEvent,
  populateNotification,
  serializeNotification,
} = require("../../services/notification-service.js");

const MAX_NOTIFICATIONS = 80;

const listNotifications = async (req, res) => {
  const userId = req.user.id;

  const [items, unreadCount] = await Promise.all([
    populateNotification(
      Notification.find({
        recipientId: userId,
        dismissedAt: null,
      })
        .sort({ createdAt: -1 })
        .limit(MAX_NOTIFICATIONS),
    ),
    Notification.countDocuments({
      recipientId: userId,
      dismissedAt: null,
      readAt: null,
    }),
  ]);

  res.json({
    items: items.map(serializeNotification),
    unreadCount,
  });
};

const markNotificationRead = async (req, res) => {
  const doc = await populateNotification(
    Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipientId: req.user.id,
        dismissedAt: null,
      },
      {
        $set: { readAt: new Date() },
      },
      { new: true },
    ),
  );

  if (!doc) throw ApiError.notFound("Notification not found");

  const payload = serializeNotification(doc);
  emitNotificationEvent(req.user.id, "notification-updated", payload);
  res.json(payload);
};

const markAllNotificationsRead = async (req, res) => {
  const now = new Date();
  const result = await Notification.updateMany(
    {
      recipientId: req.user.id,
      dismissedAt: null,
      readAt: null,
    },
    {
      $set: { readAt: now },
    },
  );

  emitNotificationEvent(req.user.id, "notifications-updated", {
    at: now.toISOString(),
  });

  res.json({
    ok: true,
    modifiedCount: result.modifiedCount || 0,
  });
};

const dismissNotification = async (req, res) => {
  const doc = await populateNotification(
    Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipientId: req.user.id,
        dismissedAt: null,
      },
      {
        $set: {
          readAt: new Date(),
          dismissedAt: new Date(),
        },
      },
      { new: true },
    ),
  );

  if (!doc) throw ApiError.notFound("Notification not found");

  const payload = serializeNotification(doc);
  emitNotificationEvent(req.user.id, "notification-updated", payload);
  res.json(payload);
};

module.exports = {
  dismissNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
};
