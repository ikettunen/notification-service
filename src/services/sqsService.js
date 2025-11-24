const { SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { sqsClient, queues } = require('../config/aws');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * Send a message to SQS queue
 * @param {object} notification - Notification data
 * @returns {Promise<object>} - SQS send result
 */
const sendToSQS = async (notification) => {
  const params = {
    QueueUrl: queues.NOTIFICATIONS,
    MessageBody: JSON.stringify(notification),
    MessageAttributes: {
      notificationType: {
        DataType: 'String',
        StringValue: notification.type
      },
      priority: {
        DataType: 'String',
        StringValue: notification.priority || 'normal'
      }
    }
  };

  try {
    const command = new SendMessageCommand(params);
    const result = await sqsClient.send(command);
    
    logger.info({
      messageId: result.MessageId,
      queueUrl: queues.NOTIFICATIONS
    }, 'SQS message sent successfully');
    
    return {
      success: true,
      messageId: result.MessageId,
      queueUrl: queues.NOTIFICATIONS
    };
  } catch (error) {
    logger.error({ error }, 'Failed to send SQS message');
    throw error;
  }
};

/**
 * Receive messages from SQS queue
 * @param {number} maxMessages - Maximum number of messages to receive
 * @returns {Promise<array>} - Array of messages
 */
const receiveFromSQS = async (maxMessages = 10) => {
  const params = {
    QueueUrl: queues.NOTIFICATIONS,
    MaxNumberOfMessages: maxMessages,
    WaitTimeSeconds: 10,
    MessageAttributeNames: ['All']
  };

  try {
    const command = new ReceiveMessageCommand(params);
    const result = await sqsClient.send(command);
    
    return result.Messages || [];
  } catch (error) {
    logger.error({ error }, 'Failed to receive SQS messages');
    throw error;
  }
};

/**
 * Delete a message from SQS queue
 * @param {string} receiptHandle - Receipt handle of the message
 * @returns {Promise<object>} - Delete result
 */
const deleteFromSQS = async (receiptHandle) => {
  const params = {
    QueueUrl: queues.NOTIFICATIONS,
    ReceiptHandle: receiptHandle
  };

  try {
    const command = new DeleteMessageCommand(params);
    await sqsClient.send(command);
    
    logger.info('SQS message deleted successfully');
    
    return { success: true };
  } catch (error) {
    logger.error({ error }, 'Failed to delete SQS message');
    throw error;
  }
};

module.exports = {
  sendToSQS,
  receiveFromSQS,
  deleteFromSQS
};
