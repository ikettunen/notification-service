const notificationService = require('../services/notificationService');
const Notification = require('../models/Notification');
const Joi = require('joi');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Validation schemas
const notificationSchema = Joi.object({
  type: Joi.string().required(),
  entityType: Joi.string().valid('task', 'alarm', 'visit', 'medicine').required(),
  entityId: Joi.string().required(),
  title: Joi.string().required(),
  message: Joi.string().required(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  recipients: Joi.array().items(Joi.string()),
  metadata: Joi.object()
});

const taskNotificationSchema = Joi.object({
  taskId: Joi.string().required(),
  title: Joi.string().required(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent'),
  assignedTo: Joi.string(),
  dueDate: Joi.date(),
  patientId: Joi.string()
});

const alarmNotificationSchema = Joi.object({
  alarmId: Joi.string().required(),
  alarmType: Joi.string().required(),
  message: Joi.string(),
  patientId: Joi.string(),
  location: Joi.string(),
  recipients: Joi.array().items(Joi.string())
});

const visitNotificationSchema = Joi.object({
  visitId: Joi.string().required(),
  patientId: Joi.string().required(),
  nurseId: Joi.string(),
  status: Joi.string().required(),
  visitType: Joi.string(),
  recipients: Joi.array().items(Joi.string())
});

const medicineNotificationSchema = Joi.object({
  medicineId: Joi.string().required(),
  patientId: Joi.string().required(),
  medicineName: Joi.string().required(),
  changeType: Joi.string().valid('added', 'updated', 'removed').required(),
  dosage: Joi.string(),
  message: Joi.string(),
  recipients: Joi.array().items(Joi.string())
});

/**
 * Create a generic notification
 */
const createNotification = async (req, res) => {
  try {
    const { error, value } = notificationSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const result = await notificationService.createNotification(value);
    
    res.status(201).json(result);
  } catch (err) {
    logger.error({ error: err }, 'Error creating notification');
    res.status(500).json({ error: err.message });
  }
};

/**
 * Create a task notification
 */
const createTaskNotification = async (req, res) => {
  try {
    const { error, value } = taskNotificationSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const result = await notificationService.createTaskNotification(value);
    
    res.status(201).json(result);
  } catch (err) {
    logger.error({ error: err }, 'Error creating task notification');
    res.status(500).json({ error: err.message });
  }
};

/**
 * Create an alarm notification
 */
const createAlarmNotification = async (req, res) => {
  try {
    const { error, value } = alarmNotificationSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const result = await notificationService.createAlarmNotification(value);
    
    res.status(201).json(result);
  } catch (err) {
    logger.error({ error: err }, 'Error creating alarm notification');
    res.status(500).json({ error: err.message });
  }
};

/**
 * Create a visit status notification
 */
const createVisitStatusNotification = async (req, res) => {
  try {
    const { error, value } = visitNotificationSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const result = await notificationService.createVisitStatusNotification(value);
    
    res.status(201).json(result);
  } catch (err) {
    logger.error({ error: err }, 'Error creating visit status notification');
    res.status(500).json({ error: err.message });
  }
};

/**
 * Create a medicine notification
 */
const createMedicineNotification = async (req, res) => {
  try {
    const { error, value } = medicineNotificationSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const result = await notificationService.createMedicineNotification(value);
    
    res.status(201).json(result);
  } catch (err) {
    logger.error({ error: err }, 'Error creating medicine notification');
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get notifications for a recipient
 */
const getNotifications = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const { type, read, priority, limit = 50 } = req.query;
    
    const options = {
      type,
      read: read !== undefined ? read === 'true' : undefined,
      priority,
      limit: parseInt(limit)
    };
    
    const notifications = await Notification.findByRecipient(recipientId, options);
    
    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (err) {
    logger.error({ error: err }, 'Error getting notifications');
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get unread notification count
 */
const getUnreadCount = async (req, res) => {
  try {
    const { recipientId } = req.params;
    
    const count = await Notification.getUnreadCount(recipientId);
    
    res.status(200).json({
      success: true,
      recipientId,
      unreadCount: count
    });
  } catch (err) {
    logger.error({ error: err }, 'Error getting unread count');
    res.status(500).json({ error: err.message });
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findById(id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    await notification.markAsRead();
    
    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (err) {
    logger.error({ error: err }, 'Error marking notification as read');
    res.status(500).json({ error: err.message });
  }
};

/**
 * Mark all notifications as read for a recipient
 */
const markAllAsRead = async (req, res) => {
  try {
    const { recipientId } = req.params;
    
    const result = await Notification.markAllAsRead(recipientId);
    
    res.status(200).json({
      success: true,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    logger.error({ error: err }, 'Error marking all as read');
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete a notification
 */
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findByIdAndDelete(id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.status(200).json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (err) {
    logger.error({ error: err }, 'Error deleting notification');
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get notification statistics
 */
const getStats = async (req, res) => {
  try {
    const { recipientId } = req.params;
    
    const stats = await Notification.getStats(recipientId);
    
    res.status(200).json({
      success: true,
      data: stats[0] || { total: 0, unread: 0 }
    });
  } catch (err) {
    logger.error({ error: err }, 'Error getting stats');
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createNotification,
  createTaskNotification,
  createAlarmNotification,
  createVisitStatusNotification,
  createMedicineNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getStats
};
