const Notification = require('../models/Notification');

const getMyNotifications = async (req, res) => {
  try {
    const { limit = 50, unreadOnly } = req.query;
    const filter = { user: req.user._id };
    if (unreadOnly === 'true') filter.read = false;
    const list = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit) || 50)
      .lean();
    const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
    res.json({ notifications: list, unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findOne({ _id: req.params.id, user: req.user._id });
    if (!notif) return res.status(404).json({ message: 'Notification non trouvée' });
    notif.read = true;
    notif.readAt = new Date();
    await notif.save();
    res.json(notif);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true, readAt: new Date() });
    const list = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ notifications: list, unreadCount: 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getMyNotifications, markAsRead, markAllAsRead };
