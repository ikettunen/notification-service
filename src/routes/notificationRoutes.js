const express = require('express');
const notificationController = require('../controllers/notificationController');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/notifications:
 *   post:
 *     summary: Create a generic notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - entityType
 *               - entityId
 *               - title
 *               - message
 *             properties:
 *               type:
 *                 type: string
 *               entityType:
 *                 type: string
 *                 enum: [task, alarm, visit, medicine]
 *               entityId:
 *                 type: string
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, urgent]
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Notification created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateJWT, notificationController.createNotification);

/**
 * @swagger
 * /api/notifications/task:
 *   post:
 *     summary: Create a task notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskId
 *               - title
 *             properties:
 *               taskId:
 *                 type: string
 *               title:
 *                 type: string
 *               priority:
 *                 type: string
 *               assignedTo:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               patientId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Task notification created successfully
 */
router.post('/task', authenticateJWT, notificationController.createTaskNotification);

/**
 * @swagger
 * /api/notifications/alarm:
 *   post:
 *     summary: Create an alarm notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - alarmId
 *               - alarmType
 *             properties:
 *               alarmId:
 *                 type: string
 *               alarmType:
 *                 type: string
 *               message:
 *                 type: string
 *               patientId:
 *                 type: string
 *               location:
 *                 type: string
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Alarm notification created successfully
 */
router.post('/alarm', authenticateJWT, notificationController.createAlarmNotification);

/**
 * @swagger
 * /api/notifications/visit:
 *   post:
 *     summary: Create a visit status notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - visitId
 *               - patientId
 *               - status
 *             properties:
 *               visitId:
 *                 type: string
 *               patientId:
 *                 type: string
 *               nurseId:
 *                 type: string
 *               status:
 *                 type: string
 *               visitType:
 *                 type: string
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Visit notification created successfully
 */
router.post('/visit', authenticateJWT, notificationController.createVisitStatusNotification);

/**
 * @swagger
 * /api/notifications/medicine:
 *   post:
 *     summary: Create a medicine notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - medicineId
 *               - patientId
 *               - medicineName
 *               - changeType
 *             properties:
 *               medicineId:
 *                 type: string
 *               patientId:
 *                 type: string
 *               medicineName:
 *                 type: string
 *               changeType:
 *                 type: string
 *                 enum: [added, updated, removed]
 *               dosage:
 *                 type: string
 *               message:
 *                 type: string
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Medicine notification created successfully
 */
router.post('/medicine', authenticateJWT, notificationController.createMedicineNotification);

// Get notifications for a recipient
router.get('/recipient/:recipientId', notificationController.getNotifications);

// Get unread count
router.get('/recipient/:recipientId/unread-count', notificationController.getUnreadCount);

// Get statistics
router.get('/recipient/:recipientId/stats', notificationController.getStats);

// Mark notification as read
router.put('/:id/read', notificationController.markAsRead);

// Mark all as read for recipient
router.put('/recipient/:recipientId/read-all', notificationController.markAllAsRead);

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
