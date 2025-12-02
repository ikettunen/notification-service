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
 * Generate mock notifications for demonstration
 */
const generateMockNotifications = (recipientId) => {
  const mockNotifications = [
    {
      id: 'notif-1',
      type: 'task',
      entityType: 'task',
      entityId: 'task-123',
      title: 'Medication Round Due',
      message: 'Morning medication round for Room 101-105 is due in 15 minutes',
      priority: 'high',
      recipients: [recipientId],
      read: false,
      createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      metadata: { room: '101-105', round: 'morning' }
    },
    {
      id: 'notif-2',
      type: 'alarm',
      entityType: 'alarm',
      entityId: 'alarm-456',
      title: 'Patient Call Button',
      message: 'Patient in Room 108 has pressed the call button',
      priority: 'urgent',
      recipients: [recipientId],
      read: false,
      createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      metadata: { room: '108', patient: 'Liisa Heikkinen' }
    },
    {
      id: 'notif-3',
      type: 'visit',
      entityType: 'visit',
      entityId: 'visit-789',
      title: 'Visit Completed',
      message: 'Blood pressure check for Matti Virtanen has been completed',
      priority: 'normal',
      recipients: [recipientId],
      read: true,
      createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      metadata: { patient: 'Matti Virtanen', visitType: 'Blood Pressure Check' }
    },
    {
      id: 'notif-4',
      type: 'medicine',
      entityType: 'medicine',
      entityId: 'med-101',
      title: 'Medication Updated',
      message: 'Lisinopril dosage updated for Aino Korhonen',
      priority: 'normal',
      recipients: [recipientId],
      read: false,
      createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
      metadata: { patient: 'Aino Korhonen', medication: 'Lisinopril' }
    },
    {
      id: 'notif-5',
      type: 'task',
      entityType: 'task',
      entityId: 'task-202',
      title: 'Care Plan Review',
      message: 'Weekly care plan review scheduled for Veikko Lahtinen',
      priority: 'low',
      recipients: [recipientId],
      read: true,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      metadata: { patient: 'Veikko Lahtinen', reviewType: 'weekly' }
    },
    {
      id: 'notif-6',
      type: 'alarm',
      entityType: 'alarm',
      entityId: 'alarm-303',
      title: 'Equipment Maintenance',
      message: 'Blood pressure monitor in Room 105 requires calibration',
      priority: 'normal',
      recipients: [recipientId],
      read: false,
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      metadata: { room: '105', equipment: 'Blood Pressure Monitor' }
    }
  ];

  // Return random 1-6 notifications
  const count = Math.floor(Math.random() * 6) + 1;
  return mockNotifications.slice(0, count);
};

/**
 * Get notifications for a recipient
 */
const getNotifications = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const { type, read, priority, limit = 50 } = req.query;
    
    // Generate mock notifications
    let notifications = generateMockNotifications(recipientId);
    
    // Apply filters
    if (type) {
      notifications = notifications.filter(n => n.type === type);
    }
    
    if (read !== undefined) {
      const isRead = read === 'true';
      notifications = notifications.filter(n => n.read === isRead);
    }
    
    if (priority) {
      notifications = notifications.filter(n => n.priority === priority);
    }
    
    // Apply limit
    notifications = notifications.slice(0, parseInt(limit));
    
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
    
    // Generate mock notifications and count unread
    const notifications = generateMockNotifications(recipientId);
    const count = notifications.filter(n => !n.read).length;
    
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
    
    // For mock implementation, just return success
    res.status(200).json({
      success: true,
      message: `Notification ${id} marked as read`,
      data: { id, read: true, readAt: new Date() }
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
    
    // For mock implementation, return success with mock count
    const notifications = generateMockNotifications(recipientId);
    const unreadCount = notifications.filter(n => !n.read).length;
    
    res.status(200).json({
      success: true,
      modifiedCount: unreadCount,
      message: `All notifications marked as read for ${recipientId}`
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
