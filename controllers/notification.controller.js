import notificationService from "../services/notification.service.js";

/* ---- ADMIN ENDPOINTS ---- */

const getNotifications = async (req, res, next) => {
  try {
    const unread_only = req.query.unread_only === "true";
    const limit = parseInt(req.query.limit) || 50;

    const notifications = await notificationService.getAllAdmin({ unread_only, limit });
    const unreadCount = await notificationService.getAdminUnreadCount();

    res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const count = await notificationService.getAdminUnreadCount();
    res.status(200).json({ count });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    await notificationService.markAsRead(req.params.id);
    res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await notificationService.markAllAsReadAdmin();
    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    next(error);
  }
};

/* ---- CUSTOMER ENDPOINTS ---- */

const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const unread_only = req.query.unread_only === "true";
    const limit = parseInt(req.query.limit) || 50;

    const notifications = await notificationService.getAllForUser(userId, { unread_only, limit });
    const unreadCount = await notificationService.getUserUnreadCount(userId);

    res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

const getMyUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const count = await notificationService.getUserUnreadCount(userId);
    res.status(200).json({ count });
  } catch (error) {
    next(error);
  }
};

const markMyAsRead = async (req, res, next) => {
  try {
    await notificationService.markAsRead(req.params.id);
    res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    next(error);
  }
};

const markAllMyAsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    await notificationService.markAllAsReadForUser(userId);
    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    next(error);
  }
};

export {
  getNotifications, getUnreadCount, markAsRead, markAllAsRead,
  getMyNotifications, getMyUnreadCount, markMyAsRead, markAllMyAsRead
};
