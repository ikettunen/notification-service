# Notification Service

Notification microservice for Nursing Home Dashboard - AWS SNS/SQS integration.

## Features

- **Stateless Design**: No database storage - notifications are sent directly to AWS SNS/SQS
- **AWS SNS Integration**: Real-time push notifications via SNS topics
- **AWS SQS Integration**: Reliable message queuing for processing
- **Multiple Notification Types**:
  - Task notifications
  - Alarm notifications
  - Visit status changes
  - Medicine updates
- **Priority Levels**: low, normal, high, urgent
- **JWT Authentication**: Secure API endpoints
- **Swagger Documentation**: Interactive API documentation

## Architecture

```
Client → Notification Service → AWS SNS (Real-time push)
                              → AWS SQS (Queue for processing)
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your AWS credentials and configuration
```

3. Start the service:
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Service health check

### Notifications
- `POST /api/notifications` - Create generic notification
- `POST /api/notifications/task` - Create task notification
- `POST /api/notifications/alarm` - Create alarm notification
- `POST /api/notifications/visit` - Create visit status notification
- `POST /api/notifications/medicine` - Create medicine notification

## API Documentation

Access Swagger documentation at: `http://localhost:3009/api-docs`

## Example Usage

### Create Task Notification
```bash
curl -X POST http://localhost:3009/api/notifications/task \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "task-123",
    "title": "Medication Round",
    "priority": "high",
    "assignedTo": "nurse-456",
    "dueDate": "2024-11-17T14:00:00Z",
    "patientId": "patient-789"
  }'
```

### Create Alarm Notification
```bash
curl -X POST http://localhost:3009/api/notifications/alarm \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "alarmId": "alarm-123",
    "alarmType": "fall_detection",
    "message": "Fall detected in Room 204",
    "patientId": "patient-789",
    "location": "Room 204",
    "recipients": ["nurse-456", "nurse-789"]
  }'
```

## AWS Configuration

### Required SNS Topics
- `nursing-home-tasks` - Task notifications
- `nursing-home-alarms` - Alarm notifications
- `nursing-home-visits` - Visit status changes
- `nursing-home-medicine` - Medicine updates

### Required SQS Queue
- `nursing-home-notifications` - General notification queue

## Environment Variables

```env
PORT=3009
NODE_ENV=development
LOG_LEVEL=info

AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

SNS_TOPIC_ARN_TASK=arn:aws:sns:region:account:topic
SNS_TOPIC_ARN_ALARM=arn:aws:sns:region:account:topic
SNS_TOPIC_ARN_VISIT=arn:aws:sns:region:account:topic
SNS_TOPIC_ARN_MEDICINE=arn:aws:sns:region:account:topic

SQS_QUEUE_URL=https://sqs.region.amazonaws.com/account/queue

JWT_SECRET=your_jwt_secret
```

## Testing

```bash
npm test
```

## Port

Default port: `3009`
