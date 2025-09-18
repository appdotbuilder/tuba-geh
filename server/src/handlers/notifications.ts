import { db } from '../db';
import { notificationsTable, borrowingsTable, usersTable } from '../db/schema';
import { type CreateNotificationInput, type MarkNotificationReadInput, type Notification } from '../schema';
import { eq, desc, and, isNull, lte, SQL } from 'drizzle-orm';

export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  try {
    const result = await db.insert(notificationsTable)
      .values({
        user_id: input.user_id,
        borrowing_id: input.borrowing_id,
        message: input.message,
        is_read: false
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Notification creation failed:', error);
    throw error;
  }
}

export async function getNotificationsByUserId(userId: number): Promise<Notification[]> {
  try {
    const results = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.user_id, userId))
      .orderBy(desc(notificationsTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch notifications for user:', error);
    throw error;
  }
}

export async function getUnreadNotificationsByUserId(userId: number): Promise<Notification[]> {
  try {
    const results = await db.select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.user_id, userId),
          eq(notificationsTable.is_read, false)
        )
      )
      .orderBy(desc(notificationsTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch unread notifications for user:', error);
    throw error;
  }
}

export async function markNotificationAsRead(input: MarkNotificationReadInput): Promise<Notification> {
  try {
    const result = await db.update(notificationsTable)
      .set({ is_read: true })
      .where(eq(notificationsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Notification with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    throw error;
  }
}

export async function markAllNotificationsAsRead(userId: number): Promise<boolean> {
  try {
    const result = await db.update(notificationsTable)
      .set({ is_read: true })
      .where(
        and(
          eq(notificationsTable.user_id, userId),
          eq(notificationsTable.is_read, false)
        )
      )
      .execute();

    return true;
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    throw error;
  }
}

export async function generateOverdueNotifications(): Promise<number> {
  try {
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find overdue borrowings (borrowed more than 30 days ago and not returned)
    const overdueBorrowings = await db.select({
      borrowing_id: borrowingsTable.id,
      user_id: borrowingsTable.user_id,
      borrowed_at: borrowingsTable.borrowed_at,
      document_type: borrowingsTable.document_type,
      document_id: borrowingsTable.document_id
    })
      .from(borrowingsTable)
      .where(
        and(
          lte(borrowingsTable.borrowed_at, thirtyDaysAgo),
          eq(borrowingsTable.status, 'borrowed'),
          isNull(borrowingsTable.returned_at)
        )
      )
      .execute();

    if (overdueBorrowings.length === 0) {
      return 0;
    }

    let notificationsCreated = 0;

    // Create notifications for each overdue borrowing
    for (const borrowing of overdueBorrowings) {
      // Check if notification already exists for this borrowing
      const existingNotification = await db.select()
        .from(notificationsTable)
        .where(eq(notificationsTable.borrowing_id, borrowing.borrowing_id))
        .limit(1)
        .execute();

      if (existingNotification.length === 0) {
        // Calculate days overdue
        const daysOverdue = Math.floor(
          (new Date().getTime() - borrowing.borrowed_at.getTime()) / (1000 * 60 * 60 * 24)
        );

        const message = `Document ${borrowing.document_type} (ID: ${borrowing.document_id}) is overdue by ${daysOverdue} days. Please return it as soon as possible.`;

        await db.insert(notificationsTable)
          .values({
            user_id: borrowing.user_id,
            borrowing_id: borrowing.borrowing_id,
            message: message,
            is_read: false
          })
          .execute();

        notificationsCreated++;
      }
    }

    return notificationsCreated;
  } catch (error) {
    console.error('Failed to generate overdue notifications:', error);
    throw error;
  }
}