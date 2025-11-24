const { PublishCommand } = require('@aws-sdk/client-sns');
const { snsClient, topics } = require('../config/aws');
const pino = require('pino');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * Publish a notification to SNS topic
 * @param {string} topicType - Type of topic (TASK, ALARM, VISIT, MEDICINE)
 * @param {object} notification - Notification data
 * @returns {Promise<object>} - SNS publish result
 */
const publishToSNS = async (topicType, notification) => {
  const topicArn = topics[topicType];
  
  if (!topicArn) {
    throw new Error(`Invalid topic type: ${topicType}`);
  }

  const params = {
    TopicArn: topicArn,
    Message: JSON.stringify(notification),
    Subject: notification.title || 'Nursing Home Notification',
    MessageAttributes: {
      notificationType: {
        DataType: 'String',
        StringValue: notification.type
      },
      priority: {
        DataType: 'String',
        StringValue: notification.priority || 'normal'
      },
      timestamp: {
        DataType: 'String',
        StringValue: new Date().toISOString()
      }
    }
  };

  try {
    const command = new PublishCommand(params);
    const result = await snsClient.send(command);
    
    logger.info({
      messageId: result.MessageId,
      topicArn,
      notificationType: notification.type
    }, 'SNS notification published successfully');
    
    return {
      success: true,
      messageId: result.MessageId,
      topicArn
    };
  } catch (error) {
    logger.error({ error, topicArn }, 'Failed to publish SNS notification');
    throw error;
  }
};

module.exports = {
  publishToSNS
};
