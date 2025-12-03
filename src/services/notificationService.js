const { publishToSNS } = require('./snsService');
const { sendToSQS } = require('./sqsService');
const Notification = require('../models/Notification');
const { v4: uuidv4 } = require('uuid');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * Create and send a notification
 * @param {object} notificationData - Notification data
 * @returns {Promise<object>} - Result of notification sending
 */
const createNotification = async (notificationData) => {
  const {
    type,
    entityType,
    entityId,
    title,
    message,
    priority = 'normal',
    recipients = [],
    metadata = {}
  } = notificationData;

  // Create notification object
  const notification = {
    id: uuidv4(),
    type,
    entityType,
    entityId,
    title,
    message,
    priority,
    recipients,
    metadata,
    timestamp: new Date().toISOString(),
    status: 'sent'
  };

  logger.info({ notification }, 'Creating notification');

  // Determine which SNS topic to use based on entity type
  let topicType;
  switch (entityType) {
    case 'task':
      topicType = 'TASK';
      break;
    case 'alarm':
      topicType = 'ALARM';
      break;
    case 'visit':
      topicType = 'VISIT';
      break;
    case 'medicine':
      topicType = 'MEDICINE';
      break;
    case 'audio':
      topicType = 'TASK'; // Route audio uploads to TASK topic
      break;
    case 'photo':
      topicType = 'TASK'; // Route photo uploads to TASK topic
      break;
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }

  try {
    // For local development, skip AWS services
    if (process.env.NODE_ENV === 'development') {
      logger.info('Local development mode - skipping AWS SNS/SQS');
      return {
        success: true,
        notification,
        sns: { success: true, messageId: 'local-dev-mock' },
        sqs: { success: true, messageId: 'local-dev-mock' }
      };
    }
    
    // Send to SNS for real-time notifications
    const snsResult = await publishToSNS(topicType, notification);
    
    // Also send to SQS for processing/logging
    const sqsResult = await sendToSQS(notification);

    return {
      success: true,
      notification,
      sns: snsResult,
      sqs: sqsResult
    };
  } catch (error) {
    logger.error({ error, notification }, 'Failed to create notification');
    throw error;
  }
};

/**
 * Create task notification
 */
const createTaskNotification = async (taskData) => {
  return createNotification({
    type: 'task_created',
    entityType: 'task',
    entityId: taskData.taskId,
    title: 'New Task Assigned',
    message: `Task "${taskData.title}" has been assigned to you`,
    priority: taskData.priority || 'normal',
    recipients: taskData.assignedTo ? [taskData.assignedTo] : [],
    metadata: {
      taskTitle: taskData.title,
      dueDate: taskData.dueDate,
      patientId: taskData.patientId
    }
  });
};

/**
 * Create alarm notification
 */
const createAlarmNotification = async (alarmData) => {
  return createNotification({
    type: 'alarm_triggered',
    entityType: 'alarm',
    entityId: alarmData.alarmId,
    title: 'Alarm Triggered',
    message: alarmData.message || 'An alarm has been triggered',
    priority: 'high',
    recipients: alarmData.recipients || [],
    metadata: {
      alarmType: alarmData.alarmType,
      patientId: alarmData.patientId,
      location: alarmData.location
    }
  });
};

/**
 * Create visit status change notification
 */
const createVisitStatusNotification = async (visitData) => {
  return createNotification({
    type: 'visit_status_changed',
    entityType: 'visit',
    entityId: visitData.visitId,
    title: 'Visit Status Updated',
    message: `Visit status changed to ${visitData.status}`,
    priority: 'normal',
    recipients: visitData.recipients || [],
    metadata: {
      patientId: visitData.patientId,
      nurseId: visitData.nurseId,
      status: visitData.status,
      visitType: visitData.visitType
    }
  });
};

/**
 * Create medicine change notification
 */
const createMedicineNotification = async (medicineData) => {
  return createNotification({
    type: 'medicine_updated',
    entityType: 'medicine',
    entityId: medicineData.medicineId,
    title: 'Medication Updated',
    message: medicineData.message || 'Patient medication has been updated',
    priority: 'high',
    recipients: medicineData.recipients || [],
    metadata: {
      patientId: medicineData.patientId,
      medicineName: medicineData.medicineName,
      changeType: medicineData.changeType,
      dosage: medicineData.dosage
    }
  });
};

module.exports = {
  createNotification,
  createTaskNotification,
  createAlarmNotification,
  createVisitStatusNotification,
  createMedicineNotification
};
