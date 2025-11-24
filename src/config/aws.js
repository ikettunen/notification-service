const { SNSClient } = require('@aws-sdk/client-sns');
const { SQSClient } = require('@aws-sdk/client-sqs');

// AWS Configuration
const awsConfig = {
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
};

// Initialize SNS Client
const snsClient = new SNSClient(awsConfig);

// Initialize SQS Client
const sqsClient = new SQSClient(awsConfig);

// Topic ARNs
const topics = {
  TASK: process.env.SNS_TOPIC_ARN_TASK,
  ALARM: process.env.SNS_TOPIC_ARN_ALARM,
  VISIT: process.env.SNS_TOPIC_ARN_VISIT,
  MEDICINE: process.env.SNS_TOPIC_ARN_MEDICINE
};

// Queue URLs
const queues = {
  NOTIFICATIONS: process.env.SQS_QUEUE_URL
};

module.exports = {
  snsClient,
  sqsClient,
  topics,
  queues
};
