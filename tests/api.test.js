const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Notification = require('../src/models/Notification');

let mongoServer;
let app;

// Set test environment
process.env.NODE_ENV = 'test';

// Mock the database connection
jest.mock('../src/config/database', () => jest.fn());

// Mock SNS and SQS services
jest.mock('../src/services/snsService', () => ({
  publishToSNS: jest.fn().mockResolvedValue({ MessageId: 'mock-sns-id' })
}));

jest.mock('../src/services/sqsService', () => ({
  sendToSQS: jest.fn().mockResolvedValue({ MessageId: 'mock-sqs-id' })
}));

// Mock auth middleware
jest.mock('../src/middleware/auth', () => ({
  authenticateJWT: (req, res, next) => {
    req.user = { sub: 'user123', role: 'doctor' };
    next();
  }
}));

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  // Import app after mocks are set up
  app = require('../src/server');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
  jest.clearAllMocks();
});

describe('Notification API Endpoints', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('notification-service');
    });
  });

  describe('POST /api/notifications', () => {
    it('should create a generic notification', async () => {
      const notificationData = {
        type: 'file_upload',
        entityType: 'visit',
        entityId: 'visit123',
        title: 'File Uploaded',
        message: 'A new file has been uploaded',
        priority: 'high',
        recipients: ['doctor1'],
        metadata: { fileType: 'photo' }
      };

      const response = await request(app)
        .post('/api/notifications')
        .send(notificationData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.notification).toBeDefined();
      expect(response.body.notification.type).toBe('file_upload');
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        title: 'Test'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/notifications')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/notifications/task', () => {
    it('should create a task notification', async () => {
      const taskData = {
        taskId: 'task123',
        title: 'Review Patient Chart',
        priority: 'high',
        assignedTo: 'doctor1',
        dueDate: new Date().toISOString(),
        patientId: 'patient456'
      };

      const response = await request(app)
        .post('/api/notifications/task')
        .send(taskData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.notification.entityType).toBe('task');
    });
  });

  describe('POST /api/notifications/alarm', () => {
    it('should create an alarm notification', async () => {
      const alarmData = {
        alarmId: 'alarm123',
        alarmType: 'fall_detection',
        message: 'Patient fall detected',
        patientId: 'patient456',
        location: 'Room 101',
        recipients: ['nurse1', 'doctor1']
      };

      const response = await request(app)
        .post('/api/notifications/alarm')
        .send(alarmData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.notification.entityType).toBe('alarm');
    });
  });

  describe('POST /api/notifications/visit', () => {
    it('should create a visit status notification', async () => {
      const visitData = {
        visitId: 'visit123',
        patientId: 'patient456',
        nurseId: 'nurse1',
        status: 'completed',
        visitType: 'routine_checkup',
        recipients: ['doctor1']
      };

      const response = await request(app)
        .post('/api/notifications/visit')
        .send(visitData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.notification.entityType).toBe('visit');
    });
  });

  describe('POST /api/notifications/medicine', () => {
    it('should create a medicine notification', async () => {
      const medicineData = {
        medicineId: 'med123',
        patientId: 'patient456',
        medicineName: 'Aspirin',
        changeType: 'added',
        dosage: '100mg daily',
        message: 'New medication added',
        recipients: ['nurse1', 'doctor1']
      };

      const response = await request(app)
        .post('/api/notifications/medicine')
        .send(medicineData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.notification.entityType).toBe('medicine');
    });
  });

  describe('GET /api/notifications/recipient/:recipientId', () => {
    beforeEach(async () => {
      await Notification.create([
        {
          type: 'file_upload',
          title: 'Photo 1',
          message: 'Photo uploaded',
          recipientId: 'doctor1',
          priority: 'high',
          read: false
        },
        {
          type: 'task_assigned',
          title: 'Task 1',
          message: 'Task assigned',
          recipientId: 'doctor1',
          priority: 'normal',
          read: false
        },
        {
          type: 'file_upload',
          title: 'Photo 2',
          message: 'Photo uploaded',
          recipientId: 'nurse1',
          priority: 'normal',
          read: false
        }
      ]);
    });

    it('should get all notifications for a recipient', async () => {
      const response = await request(app)
        .get('/api/notifications/recipient/doctor1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/notifications/recipient/doctor1?type=file_upload');

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.data[0].type).toBe('file_upload');
    });

    it('should filter by read status', async () => {
      await Notification.findOneAndUpdate(
        { recipientId: 'doctor1', type: 'file_upload' },
        { read: true }
      );

      const response = await request(app)
        .get('/api/notifications/recipient/doctor1?read=false');

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.data[0].type).toBe('task_assigned');
    });

    it('should filter by priority', async () => {
      const response = await request(app)
        .get('/api/notifications/recipient/doctor1?priority=high');

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.data[0].priority).toBe('high');
    });

    it('should limit results', async () => {
      const response = await request(app)
        .get('/api/notifications/recipient/doctor1?limit=1');

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
    });
  });

  describe('GET /api/notifications/recipient/:recipientId/unread-count', () => {
    beforeEach(async () => {
      await Notification.create([
        {
          type: 'file_upload',
          title: 'Photo 1',
          message: 'Photo',
          recipientId: 'doctor1',
          read: false
        },
        {
          type: 'task_assigned',
          title: 'Task 1',
          message: 'Task',
          recipientId: 'doctor1',
          read: false
        },
        {
          type: 'file_upload',
          title: 'Photo 2',
          message: 'Photo',
          recipientId: 'doctor1',
          read: true
        }
      ]);
    });

    it('should get unread count', async () => {
      const response = await request(app)
        .get('/api/notifications/recipient/doctor1/unread-count');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.unreadCount).toBe(2);
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      const notification = await Notification.create({
        type: 'file_upload',
        title: 'Test',
        message: 'Test',
        recipientId: 'doctor1',
        read: false
      });

      const response = await request(app)
        .put(`/api/notifications/${notification._id}/read`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.read).toBe(true);
      expect(response.body.data.readAt).toBeDefined();
    });

    it('should return 404 for non-existent notification', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/notifications/${fakeId}/read`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/notifications/recipient/:recipientId/read-all', () => {
    beforeEach(async () => {
      await Notification.create([
        {
          type: 'file_upload',
          title: 'Photo 1',
          message: 'Photo',
          recipientId: 'doctor1',
          read: false
        },
        {
          type: 'task_assigned',
          title: 'Task 1',
          message: 'Task',
          recipientId: 'doctor1',
          read: false
        }
      ]);
    });

    it('should mark all notifications as read', async () => {
      const response = await request(app)
        .put('/api/notifications/recipient/doctor1/read-all');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.modifiedCount).toBe(2);

      const unreadCount = await Notification.getUnreadCount('doctor1');
      expect(unreadCount).toBe(0);
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('should delete a notification', async () => {
      const notification = await Notification.create({
        type: 'file_upload',
        title: 'Test',
        message: 'Test',
        recipientId: 'doctor1'
      });

      const response = await request(app)
        .delete(`/api/notifications/${notification._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const deleted = await Notification.findById(notification._id);
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent notification', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/notifications/${fakeId}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/notifications/recipient/:recipientId/stats', () => {
    beforeEach(async () => {
      await Notification.create([
        {
          type: 'file_upload',
          title: 'Photo 1',
          message: 'Photo',
          recipientId: 'doctor1',
          priority: 'high',
          read: false
        },
        {
          type: 'task_assigned',
          title: 'Task 1',
          message: 'Task',
          recipientId: 'doctor1',
          priority: 'normal',
          read: false
        },
        {
          type: 'file_upload',
          title: 'Photo 2',
          message: 'Photo',
          recipientId: 'doctor1',
          priority: 'normal',
          read: true
        }
      ]);
    });

    it('should get notification statistics', async () => {
      const response = await request(app)
        .get('/api/notifications/recipient/doctor1/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.unread).toBe(2);
    });
  });
});
