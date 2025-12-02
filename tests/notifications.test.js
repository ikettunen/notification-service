const request = require('supertest');
const app = require('../src/server');

describe('Notification Service API', () => {
  describe('Health Check', () => {
    test('GET /health should return service status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'notification-service');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Mock Notifications', () => {
    describe('GET /api/notifications/recipient/:recipientId', () => {
      test('should return mock notifications for a staff member', async () => {
        const response = await request(app)
          .get('/api/notifications/recipient/staff-1001')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('count');
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.count).toBeGreaterThan(0);
        expect(response.body.count).toBeLessThanOrEqual(6);

        // Check notification structure
        const notification = response.body.data[0];
        expect(notification).toHaveProperty('id');
        expect(notification).toHaveProperty('type');
        expect(notification).toHaveProperty('title');
        expect(notification).toHaveProperty('message');
        expect(notification).toHaveProperty('priority');
        expect(notification).toHaveProperty('read');
        expect(notification).toHaveProperty('createdAt');
        expect(['task', 'alarm', 'visit', 'medicine']).toContain(notification.type);
        expect(['low', 'normal', 'high', 'urgent']).toContain(notification.priority);
      });

      test('should filter notifications by type', async () => {
        const response = await request(app)
          .get('/api/notifications/recipient/staff-1001?type=task')
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.forEach(notification => {
          expect(notification.type).toBe('task');
        });
      });

      test('should filter notifications by read status', async () => {
        const response = await request(app)
          .get('/api/notifications/recipient/staff-1001?read=false')
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.forEach(notification => {
          expect(notification.read).toBe(false);
        });
      });

      test('should filter notifications by priority', async () => {
        const response = await request(app)
          .get('/api/notifications/recipient/staff-1001?priority=urgent')
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.forEach(notification => {
          expect(notification.priority).toBe('urgent');
        });
      });

      test('should limit number of notifications', async () => {
        const response = await request(app)
          .get('/api/notifications/recipient/staff-1001?limit=2')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeLessThanOrEqual(2);
      });
    });

    describe('GET /api/notifications/recipient/:recipientId/unread-count', () => {
      test('should return unread notification count', async () => {
        const response = await request(app)
          .get('/api/notifications/recipient/staff-1001/unread-count')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('recipientId', 'staff-1001');
        expect(response.body).toHaveProperty('unreadCount');
        expect(typeof response.body.unreadCount).toBe('number');
        expect(response.body.unreadCount).toBeGreaterThanOrEqual(0);
      });

      test('should work with different staff IDs', async () => {
        const response = await request(app)
          .get('/api/notifications/recipient/staff-1002/unread-count')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.recipientId).toBe('staff-1002');
      });
    });

    describe('PUT /api/notifications/:id/read', () => {
      test('should mark notification as read', async () => {
        const response = await request(app)
          .put('/api/notifications/notif-1/read')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('notif-1');
        expect(response.body.message).toContain('marked as read');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('id', 'notif-1');
        expect(response.body.data).toHaveProperty('read', true);
      });
    });

    describe('PUT /api/notifications/recipient/:recipientId/read-all', () => {
      test('should mark all notifications as read', async () => {
        const response = await request(app)
          .put('/api/notifications/recipient/staff-1001/read-all')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('modifiedCount');
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('staff-1001');
        expect(typeof response.body.modifiedCount).toBe('number');
      });
    });
  });

  describe('Notification Content Validation', () => {
    test('should generate realistic healthcare notifications', async () => {
      const response = await request(app)
        .get('/api/notifications/recipient/staff-1001')
        .expect(200);

      const notifications = response.body.data;
      expect(notifications.length).toBeGreaterThan(0);

      // Check for healthcare-specific content
      const titles = notifications.map(n => n.title);
      const messages = notifications.map(n => n.message);
      
      const healthcareKeywords = [
        'medication', 'patient', 'room', 'visit', 'care', 'round', 
        'blood', 'pressure', 'call', 'button', 'equipment', 'maintenance'
      ];

      const hasHealthcareContent = [...titles, ...messages].some(text => 
        healthcareKeywords.some(keyword => 
          text.toLowerCase().includes(keyword.toLowerCase())
        )
      );

      expect(hasHealthcareContent).toBe(true);
    });

    test('should include metadata with relevant information', async () => {
      const response = await request(app)
        .get('/api/notifications/recipient/staff-1001')
        .expect(200);

      const notifications = response.body.data;
      
      notifications.forEach(notification => {
        if (notification.metadata) {
          expect(typeof notification.metadata).toBe('object');
          
          // Check for common metadata fields
          const metadataKeys = Object.keys(notification.metadata);
          const expectedKeys = ['room', 'patient', 'round', 'equipment', 'medication', 'visitType', 'reviewType'];
          const hasExpectedKey = metadataKeys.some(key => expectedKeys.includes(key));
          
          if (metadataKeys.length > 0) {
            expect(hasExpectedKey).toBe(true);
          }
        }
      });
    });

    test('should have appropriate priority distribution', async () => {
      const response = await request(app)
        .get('/api/notifications/recipient/staff-1001')
        .expect(200);

      const notifications = response.body.data;
      const priorities = notifications.map(n => n.priority);
      
      // Should have a mix of priorities
      const uniquePriorities = [...new Set(priorities)];
      expect(uniquePriorities.length).toBeGreaterThan(1);
      
      // All priorities should be valid
      priorities.forEach(priority => {
        expect(['low', 'normal', 'high', 'urgent']).toContain(priority);
      });
    });

    test('should have mix of read and unread notifications', async () => {
      const response = await request(app)
        .get('/api/notifications/recipient/staff-1001')
        .expect(200);

      const notifications = response.body.data;
      const readStatuses = notifications.map(n => n.read);
      
      // Should have both read and unread notifications
      expect(readStatuses).toContain(true);
      expect(readStatuses).toContain(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid routes gracefully', async () => {
      const response = await request(app)
        .get('/api/notifications/invalid-route')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});