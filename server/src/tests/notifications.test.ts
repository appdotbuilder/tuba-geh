import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, borrowingsTable, notificationsTable, bukuTanahTable } from '../db/schema';
import { type CreateNotificationInput, type MarkNotificationReadInput } from '../schema';
import { 
  createNotification, 
  getNotificationsByUserId, 
  getUnreadNotificationsByUserId, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  generateOverdueNotifications 
} from '../handlers/notifications';
import { eq } from 'drizzle-orm';

describe('Notifications Handlers', () => {
  let testUser: { id: number };
  let testUser2: { id: number };
  let testDocument: { id: number };
  let testBorrowing: { id: number };
  let testBorrowing2: { id: number };

  beforeEach(async () => {
    await createDB();

    // Create test users
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password123',
        full_name: 'Test User',
        role: 'user'
      })
      .returning({ id: usersTable.id })
      .execute();
    testUser = userResult[0];

    const user2Result = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        password: 'password123',
        full_name: 'Test User 2',
        role: 'user'
      })
      .returning({ id: usersTable.id })
      .execute();
    testUser2 = user2Result[0];

    // Create test document
    const documentResult = await db.insert(bukuTanahTable)
      .values({
        nomor_hak: 'TEST001',
        nama_pemilik: 'Test Owner',
        desa: 'Test Village',
        kecamatan: 'Test District'
      })
      .returning({ id: bukuTanahTable.id })
      .execute();
    testDocument = documentResult[0];

    // Create test borrowings
    const borrowingResult = await db.insert(borrowingsTable)
      .values({
        user_id: testUser.id,
        document_type: 'buku_tanah',
        document_id: testDocument.id,
        status: 'borrowed',
        notes: 'Test borrowing'
      })
      .returning({ id: borrowingsTable.id })
      .execute();
    testBorrowing = borrowingResult[0];

    const borrowing2Result = await db.insert(borrowingsTable)
      .values({
        user_id: testUser2.id,
        document_type: 'buku_tanah',
        document_id: testDocument.id,
        status: 'borrowed',
        notes: 'Test borrowing 2'
      })
      .returning({ id: borrowingsTable.id })
      .execute();
    testBorrowing2 = borrowing2Result[0];
  });

  afterEach(resetDB);

  describe('createNotification', () => {
    it('should create a notification', async () => {
      const input: CreateNotificationInput = {
        user_id: testUser.id,
        borrowing_id: testBorrowing.id,
        message: 'Your document is overdue'
      };

      const result = await createNotification(input);

      expect(result.id).toBeDefined();
      expect(result.user_id).toEqual(testUser.id);
      expect(result.borrowing_id).toEqual(testBorrowing.id);
      expect(result.message).toEqual('Your document is overdue');
      expect(result.is_read).toBe(false);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save notification to database', async () => {
      const input: CreateNotificationInput = {
        user_id: testUser.id,
        borrowing_id: testBorrowing.id,
        message: 'Test notification message'
      };

      const result = await createNotification(input);

      const notifications = await db.select()
        .from(notificationsTable)
        .where(eq(notificationsTable.id, result.id))
        .execute();

      expect(notifications).toHaveLength(1);
      expect(notifications[0].user_id).toEqual(testUser.id);
      expect(notifications[0].borrowing_id).toEqual(testBorrowing.id);
      expect(notifications[0].message).toEqual('Test notification message');
      expect(notifications[0].is_read).toBe(false);
    });

    it('should handle invalid borrowing_id', async () => {
      const input: CreateNotificationInput = {
        user_id: testUser.id,
        borrowing_id: 999999,
        message: 'Test message'
      };

      // Note: Foreign key constraint may or may not be enforced depending on schema
      // This test documents current behavior - notification can be created with invalid borrowing_id
      const result = await createNotification(input);
      expect(result.borrowing_id).toEqual(999999);
    });
  });

  describe('getNotificationsByUserId', () => {
    it('should return notifications for user ordered by created_at desc', async () => {
      // Create multiple notifications for the user
      await createNotification({
        user_id: testUser.id,
        borrowing_id: testBorrowing.id,
        message: 'First notification'
      });

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      await createNotification({
        user_id: testUser.id,
        borrowing_id: testBorrowing.id,
        message: 'Second notification'
      });

      // Create notification for different user
      await createNotification({
        user_id: testUser2.id,
        borrowing_id: testBorrowing2.id,
        message: 'Other user notification'
      });

      const result = await getNotificationsByUserId(testUser.id);

      expect(result).toHaveLength(2);
      expect(result[0].message).toEqual('Second notification');
      expect(result[1].message).toEqual('First notification');
      expect(result[0].created_at.getTime()).toBeGreaterThan(result[1].created_at.getTime());
    });

    it('should return empty array for user with no notifications', async () => {
      const result = await getNotificationsByUserId(testUser.id);
      expect(result).toHaveLength(0);
    });
  });

  describe('getUnreadNotificationsByUserId', () => {
    it('should return only unread notifications for user', async () => {
      // Create read notification
      const readNotification = await createNotification({
        user_id: testUser.id,
        borrowing_id: testBorrowing.id,
        message: 'Read notification'
      });

      await markNotificationAsRead({ id: readNotification.id });

      // Create unread notification
      await createNotification({
        user_id: testUser.id,
        borrowing_id: testBorrowing.id,
        message: 'Unread notification'
      });

      const result = await getUnreadNotificationsByUserId(testUser.id);

      expect(result).toHaveLength(1);
      expect(result[0].message).toEqual('Unread notification');
      expect(result[0].is_read).toBe(false);
    });

    it('should return empty array when all notifications are read', async () => {
      const notification = await createNotification({
        user_id: testUser.id,
        borrowing_id: testBorrowing.id,
        message: 'Test notification'
      });

      await markNotificationAsRead({ id: notification.id });

      const result = await getUnreadNotificationsByUserId(testUser.id);
      expect(result).toHaveLength(0);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      const notification = await createNotification({
        user_id: testUser.id,
        borrowing_id: testBorrowing.id,
        message: 'Test notification'
      });

      expect(notification.is_read).toBe(false);

      const input: MarkNotificationReadInput = {
        id: notification.id
      };

      const result = await markNotificationAsRead(input);

      expect(result.id).toEqual(notification.id);
      expect(result.is_read).toBe(true);
      expect(result.user_id).toEqual(testUser.id);
    });

    it('should throw error for non-existent notification', async () => {
      const input: MarkNotificationReadInput = {
        id: 999999
      };

      await expect(markNotificationAsRead(input)).rejects.toThrow(/not found/i);
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('should mark all unread notifications as read for user', async () => {
      // Create multiple unread notifications
      await createNotification({
        user_id: testUser.id,
        borrowing_id: testBorrowing.id,
        message: 'Notification 1'
      });

      await createNotification({
        user_id: testUser.id,
        borrowing_id: testBorrowing.id,
        message: 'Notification 2'
      });

      // Create notification for different user
      await createNotification({
        user_id: testUser2.id,
        borrowing_id: testBorrowing2.id,
        message: 'Other user notification'
      });

      const result = await markAllNotificationsAsRead(testUser.id);

      expect(result).toBe(true);

      // Verify all notifications for testUser are read
      const userNotifications = await getNotificationsByUserId(testUser.id);
      expect(userNotifications).toHaveLength(2);
      expect(userNotifications.every(n => n.is_read)).toBe(true);

      // Verify other user's notification is still unread
      const otherUserUnread = await getUnreadNotificationsByUserId(testUser2.id);
      expect(otherUserUnread).toHaveLength(1);
    });

    it('should return true even when no notifications exist', async () => {
      const result = await markAllNotificationsAsRead(testUser.id);
      expect(result).toBe(true);
    });
  });

  describe('generateOverdueNotifications', () => {
    it('should create notifications for overdue borrowings', async () => {
      // Create an overdue borrowing (35 days ago)
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 35);

      await db.update(borrowingsTable)
        .set({ borrowed_at: overdueDate })
        .where(eq(borrowingsTable.id, testBorrowing.id))
        .execute();

      const result = await generateOverdueNotifications();

      expect(result).toEqual(1);

      // Check notification was created
      const notifications = await getNotificationsByUserId(testUser.id);
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toMatch(/overdue by \d+ days/i);
      expect(notifications[0].borrowing_id).toEqual(testBorrowing.id);
    });

    it('should not create duplicate notifications for same borrowing', async () => {
      // Create an overdue borrowing
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 35);

      await db.update(borrowingsTable)
        .set({ borrowed_at: overdueDate })
        .where(eq(borrowingsTable.id, testBorrowing.id))
        .execute();

      // Generate notifications twice
      const result1 = await generateOverdueNotifications();
      const result2 = await generateOverdueNotifications();

      expect(result1).toEqual(1);
      expect(result2).toEqual(0); // No new notifications created

      // Check only one notification exists
      const notifications = await getNotificationsByUserId(testUser.id);
      expect(notifications).toHaveLength(1);
    });

    it('should not create notifications for non-overdue borrowings', async () => {
      // Borrowing is recent (created today)
      const result = await generateOverdueNotifications();

      expect(result).toEqual(0);

      const notifications = await getNotificationsByUserId(testUser.id);
      expect(notifications).toHaveLength(0);
    });

    it('should not create notifications for returned borrowings', async () => {
      // Create an overdue borrowing that was returned
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 35);

      await db.update(borrowingsTable)
        .set({ 
          borrowed_at: overdueDate,
          status: 'returned',
          returned_at: new Date()
        })
        .where(eq(borrowingsTable.id, testBorrowing.id))
        .execute();

      const result = await generateOverdueNotifications();

      expect(result).toEqual(0);

      const notifications = await getNotificationsByUserId(testUser.id);
      expect(notifications).toHaveLength(0);
    });

    it('should calculate correct days overdue in notification message', async () => {
      const daysOverdue = 40;
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - daysOverdue);

      await db.update(borrowingsTable)
        .set({ borrowed_at: overdueDate })
        .where(eq(borrowingsTable.id, testBorrowing.id))
        .execute();

      await generateOverdueNotifications();

      const notifications = await getNotificationsByUserId(testUser.id);
      expect(notifications[0].message).toMatch(new RegExp(`overdue by ${daysOverdue} days`, 'i'));
    });
  });
});