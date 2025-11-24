const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Notification = require('../src/models/Notification');

let mongoServer;

// Setup in-memory MongoDB
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Clear database between tests
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
});

describe('Notification Model', () => {
  describe('Create Notification', () => {
    it('should create a valid notification', async () => {
      const notificationData = {
        type: 'file_upload',
        title: 'New File Uploaded',
        message: 'A new photo has been uploaded',
        priority: 'high',
        recipientId: 'staff123',
        recipientType: 'staff'
      };

      const notification = await Notification.create(notificationData);

      expect(notification._id).toBeDefined();
      expect(notification.type).toBe('file_upload');
      expect(notification.title).toBe('New File Uploaded');
      expect(notification.priority).toBe('high');
      expect(notification.recipientId).toBe('staff123');
      expect(notification.status).toBe('pending');
      expect(notification.read).toBe(false);
    });

    it('should fail without required fields', async () => {
      const notificationData = {
        title: 'Test Notification'
        // Missing type, message, recipientId
      };

      await expect(Notification.create(notificationData)).rejects.toThrow();
    });

    it('should set default values correctly', async () => {
      const notification = await Notification.create({
        type: 'task_assigned',
        title: 'Task Assigned',
        message: 'You have a new task',
        recipientId: 'staff456'
      });

      expect(notification.priority).toBe('normal');
      expect(notification.recipientType).toBe('staff');
      expect(notification.status).toBe('pending');
      expect(notification.read).toBe(false);
      expect(notification.actionRequired).toBe(false);
    });
  });

  describe('Notification Queries', () => {
    beforeEach(async () => {
      // Create test notifications
      await Notification.create([
        {
          type: 'file_upload',
          title: 'Photo Uploaded',
          message: 'New photo',
          priority: 'high',
          recipientId: 'doctor1',
          read: false
        },
        {
          type: 'task_assigned',
          title: 'Task Assigned',
          message: 'New task',
          priority: 'normal',
          recipientId: 'doctor1',
          read: false
        },
        {
          type: 'file_upload',
          title: 'Audio Uploaded',
          message: 'New audio',
          priority: 'normal',
          recipientId: 'nurse1',
          read: false
        },
        {
          type: 'task_assigned',
          title: 'Old Task',
          message: 'Old task',
          priority: 'low',
          recipientId: 'doctor1',
          read: true
        }
      ]);
    });

    it('should find unread notifications', async () => {
      const unread = await Notification.findUnread('doctor1');
      
      expect(unread).toHaveLength(2);
      expect(unread.every(n => !n.read)).toBe(true);
      expect(unread.every(n => n.recipientId === 'doctor1')).toBe(true);
    });

    it('should get unread count', async () => {
      const count = await Notification.getUnreadCount('doctor1');
      
      expect(count).toBe(2);
    });

    it('should find by recipient with filters', async () => {
      const notifications = await Notification.findByRecipient('doctor1', {
        type: 'file_upload',
        read: false
      });
      
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('file_upload');
    });

    it('should find by priority', async () => {
      const highPriority = await Notification.findByRecipient('doctor1', {
        priority: 'high'
      });
      
      expect(highPriority).toHaveLength(1);
      expect(highPriority[0].priority).toBe('high');
    });
  });

  describe('Notification Methods', () => {
    let notification;

    beforeEach(async () => {
      notification = await Notification.create({
        type: 'file_upload',
        title: 'Test Notification',
        message: 'Test message',
        priority: 'normal',
        recipientId: 'staff123',
        actionRequired: true
      });
    });

    it('should mark notification as read', async () => {
      expect(notification.read).toBe(false);
      expect(notification.readAt).toBeNull();

      await notification.markAsRead();

      expect(notification.read).toBe(true);
      expect(notification.readAt).toBeInstanceOf(Date);
      expect(notification.status).toBe('read');
    });

    it('should mark action as completed', async () => {
      expect(notification.actionCompleted).toBe(false);

      await notification.completeAction();

      expect(notification.actionCompleted).toBe(true);
      expect(notification.actionCompletedAt).toBeInstanceOf(Date);
    });

    it('should mark as delivered', async () => {
      await notification.markAsDelivered('push', 'msg-123');

      expect(notification.channels.push.sent).toBe(true);
      expect(notification.channels.push.messageId).toBe('msg-123');
      expect(notification.channels.push.sentAt).toBeInstanceOf(Date);
      expect(notification.status).toBe('sent');
    });

    it('should mark all as read for recipient', async () => {
      await Notification.create([
        {
          type: 'task_assigned',
          title: 'Task 1',
          message: 'Message 1',
          recipientId: 'staff123'
        },
        {
          type: 'task_assigned',
          title: 'Task 2',
          message: 'Message 2',
          recipientId: 'staff123'
        }
      ]);

      const result = await Notification.markAllAsRead('staff123');

      expect(result.modifiedCount).toBe(3); // Including the one from beforeEach

      const unreadCount = await Notification.getUnreadCount('staff123');
      expect(unreadCount).toBe(0);
    });
  });

  describe('Notification Virtuals', () => {
    it('should calculate age in minutes', async () => {
      const notification = await Notification.create({
        type: 'file_upload',
        title: 'Test',
        message: 'Test',
        recipientId: 'staff123'
      });

      expect(notification.ageMinutes).toBeGreaterThanOrEqual(0);
      expect(typeof notification.ageMinutes).toBe('number');
    });

    it('should check if expired', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const notExpired = await Notification.create({
        type: 'file_upload',
        title: 'Test',
        message: 'Test',
        recipientId: 'staff123',
        expiresAt: futureDate
      });

      expect(notExpired.isExpired).toBe(false);

      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);

      const expired = await Notification.create({
        type: 'file_upload',
        title: 'Test',
        message: 'Test',
        recipientId: 'staff456',
        expiresAt: pastDate
      });

      expect(expired.isExpired).toBe(true);
    });

    it('should check if urgent', async () => {
      const urgent = await Notification.create({
        type: 'alarm',
        title: 'Urgent Alert',
        message: 'Urgent',
        priority: 'urgent',
        recipientId: 'staff123'
      });

      expect(urgent.isUrgent).toBe(true);

      const normal = await Notification.create({
        type: 'task_assigned',
        title: 'Normal Task',
        message: 'Normal',
        priority: 'normal',
        recipientId: 'staff123'
      });

      expect(normal.isUrgent).toBe(false);
    });
  });

  describe('Related Entities', () => {
    it('should store related entity IDs', async () => {
      const notification = await Notification.create({
        type: 'file_upload',
        title: 'Photo Uploaded',
        message: 'New photo',
        recipientId: 'doctor1',
        relatedEntities: {
          visitId: 'visit123',
          patientId: 'patient456',
          fileId: 'file789'
        }
      });

      expect(notification.relatedEntities.visitId).toBe('visit123');
      expect(notification.relatedEntities.patientId).toBe('patient456');
      expect(notification.relatedEntities.fileId).toBe('file789');
    });

    it('should query by related entities', async () => {
      await Notification.create([
        {
          type: 'file_upload',
          title: 'Photo 1',
          message: 'Photo',
          recipientId: 'doctor1',
          relatedEntities: { patientId: 'patient123' }
        },
        {
          type: 'file_upload',
          title: 'Photo 2',
          message: 'Photo',
          recipientId: 'doctor1',
          relatedEntities: { patientId: 'patient123' }
        },
        {
          type: 'file_upload',
          title: 'Photo 3',
          message: 'Photo',
          recipientId: 'doctor1',
          relatedEntities: { patientId: 'patient456' }
        }
      ]);

      const notifications = await Notification.find({
        'relatedEntities.patientId': 'patient123'
      });

      expect(notifications).toHaveLength(2);
    });
  });

  describe('Notification Metadata', () => {
    it('should store custom metadata', async () => {
      const notification = await Notification.create({
        type: 'file_upload',
        title: 'Photo Uploaded',
        message: 'New photo',
        recipientId: 'doctor1',
        metadata: {
          fileType: 'photo',
          photoType: 'wound',
          uploaderName: 'Nurse Jane',
          uploadedAt: new Date().toISOString()
        }
      });

      expect(notification.metadata.fileType).toBe('photo');
      expect(notification.metadata.photoType).toBe('wound');
      expect(notification.metadata.uploaderName).toBe('Nurse Jane');
    });
  });

  describe('Notification Cleanup', () => {
    it('should delete old read notifications', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);

      await Notification.create([
        {
          type: 'task_assigned',
          title: 'Old Task',
          message: 'Old',
          recipientId: 'staff123',
          read: true,
          createdAt: oldDate
        },
        {
          type: 'task_assigned',
          title: 'Recent Task',
          message: 'Recent',
          recipientId: 'staff123',
          read: true
        },
        {
          type: 'task_assigned',
          title: 'Unread Task',
          message: 'Unread',
          recipientId: 'staff123',
          read: false,
          createdAt: oldDate
        }
      ]);

      await Notification.deleteOld(90);

      const remaining = await Notification.find({});
      expect(remaining).toHaveLength(2); // Recent read and old unread should remain
    });
  });
});
