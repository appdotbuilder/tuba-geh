import { db } from '../db';
import {
  usersTable,
  borrowingsTable,
  bukuTanahTable,
  suratUkurTable,
  warkahTable,
} from '../db/schema';
import { type DocumentReport, type UserBorrowingReport, type OverdueReport, type DashboardStats } from '../schema';
import { eq, count, sql, and, isNull, desc, inArray } from 'drizzle-orm';

export async function getDocumentReport(): Promise<DocumentReport[]> {
  try {
    // Get borrowing statistics for each document type
    const borrowingStats = await db
      .select({
        document_type: borrowingsTable.document_type,
        total_borrowed: count(borrowingsTable.id),
        total_returned: sql<number>`count(case when ${borrowingsTable.status} = 'returned' then 1 end)`,
        currently_borrowed: sql<number>`count(case when ${borrowingsTable.status} = 'borrowed' then 1 end)`,
      })
      .from(borrowingsTable)
      .groupBy(borrowingsTable.document_type)
      .execute();

    // Convert numeric fields and ensure all document types are included
    const documentTypes = ['buku_tanah', 'surat_ukur', 'warkah'] as const;
    const reports: DocumentReport[] = [];

    for (const docType of documentTypes) {
      const stats = borrowingStats.find(s => s.document_type === docType);
      reports.push({
        document_type: docType,
        total_borrowed: stats ? Number(stats.total_borrowed) : 0,
        total_returned: stats ? Number(stats.total_returned) : 0,
        currently_borrowed: stats ? Number(stats.currently_borrowed) : 0,
      });
    }

    return reports;
  } catch (error) {
    console.error('Document report generation failed:', error);
    throw error;
  }
}

export async function getUserBorrowingReport(): Promise<UserBorrowingReport[]> {
  try {
    // Calculate overdue threshold (30 days ago)
    const overdueThreshold = new Date();
    overdueThreshold.setDate(overdueThreshold.getDate() - 30);

    const userStats = await db
      .select({
        user_id: usersTable.id,
        user_name: usersTable.full_name,
        total_borrowings: count(borrowingsTable.id),
        overdue_borrowings: sql<number>`count(case when ${borrowingsTable.status} = 'borrowed' and ${borrowingsTable.borrowed_at} < ${overdueThreshold} then 1 end)`,
      })
      .from(usersTable)
      .leftJoin(borrowingsTable, eq(usersTable.id, borrowingsTable.user_id))
      .groupBy(usersTable.id, usersTable.full_name)
      .orderBy(desc(count(borrowingsTable.id)))
      .execute();

    // Convert numeric fields
    return userStats.map(stats => ({
      user_id: stats.user_id,
      user_name: stats.user_name,
      total_borrowings: Number(stats.total_borrowings),
      overdue_borrowings: Number(stats.overdue_borrowings),
    }));
  } catch (error) {
    console.error('User borrowing report generation failed:', error);
    throw error;
  }
}

export async function getOverdueReport(): Promise<OverdueReport[]> {
  try {
    // Calculate overdue threshold (30 days ago)
    const overdueThreshold = new Date();
    overdueThreshold.setDate(overdueThreshold.getDate() - 30);

    const overdueItems = await db
      .select({
        user_id: usersTable.id,
        user_name: usersTable.full_name,
        borrowing_id: borrowingsTable.id,
        document_type: borrowingsTable.document_type,
        document_id: borrowingsTable.document_id,
        borrowed_at: borrowingsTable.borrowed_at,
        days_overdue: sql<number>`floor(extract(epoch from (now() - ${borrowingsTable.borrowed_at})) / 86400) - 30`,
      })
      .from(borrowingsTable)
      .innerJoin(usersTable, eq(borrowingsTable.user_id, usersTable.id))
      .where(
        and(
          eq(borrowingsTable.status, 'borrowed'),
          sql`${borrowingsTable.borrowed_at} < ${overdueThreshold}`
        )
      )
      .orderBy(borrowingsTable.borrowed_at)
      .execute();

    // Convert numeric fields
    return overdueItems.map(item => ({
      user_id: item.user_id,
      user_name: item.user_name,
      borrowing_id: item.borrowing_id,
      document_type: item.document_type,
      document_id: item.document_id,
      borrowed_at: item.borrowed_at,
      days_overdue: Number(item.days_overdue),
    }));
  } catch (error) {
    console.error('Overdue report generation failed:', error);
    throw error;
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Calculate overdue threshold (30 days ago)
    const overdueThreshold = new Date();
    overdueThreshold.setDate(overdueThreshold.getDate() - 30);

    // Get document counts from each table
    const [bukuTanahCount] = await db.select({ count: count() }).from(bukuTanahTable).execute();
    const [suratUkurCount] = await db.select({ count: count() }).from(suratUkurTable).execute();
    const [warkahCount] = await db.select({ count: count() }).from(warkahTable).execute();

    // Get user count
    const [userCount] = await db.select({ count: count() }).from(usersTable).execute();

    // Get borrowing statistics
    const [borrowingStats] = await db
      .select({
        total_borrowings: count(borrowingsTable.id),
        active_borrowings: sql<number>`count(case when ${borrowingsTable.status} = 'borrowed' then 1 end)`,
        overdue_borrowings: sql<number>`count(case when ${borrowingsTable.status} = 'borrowed' and ${borrowingsTable.borrowed_at} < ${overdueThreshold} then 1 end)`,
      })
      .from(borrowingsTable)
      .execute();

    return {
      total_documents: Number(bukuTanahCount.count) + Number(suratUkurCount.count) + Number(warkahCount.count),
      total_users: Number(userCount.count),
      total_borrowings: borrowingStats ? Number(borrowingStats.total_borrowings) : 0,
      active_borrowings: borrowingStats ? Number(borrowingStats.active_borrowings) : 0,
      overdue_borrowings: borrowingStats ? Number(borrowingStats.overdue_borrowings) : 0,
    };
  } catch (error) {
    console.error('Dashboard stats generation failed:', error);
    throw error;
  }
}

export async function getUserDashboardStats(userId: number): Promise<DashboardStats> {
  try {
    // Calculate overdue threshold (30 days ago)
    const overdueThreshold = new Date();
    overdueThreshold.setDate(overdueThreshold.getDate() - 30);

    // Get document counts (all documents available for borrowing)
    const [bukuTanahCount] = await db.select({ count: count() }).from(bukuTanahTable).execute();
    const [suratUkurCount] = await db.select({ count: count() }).from(suratUkurTable).execute();
    const [warkahCount] = await db.select({ count: count() }).from(warkahTable).execute();

    // Get user-specific borrowing statistics
    const [userBorrowingStats] = await db
      .select({
        total_borrowings: count(borrowingsTable.id),
        active_borrowings: sql<number>`count(case when ${borrowingsTable.status} = 'borrowed' then 1 end)`,
        overdue_borrowings: sql<number>`count(case when ${borrowingsTable.status} = 'borrowed' and ${borrowingsTable.borrowed_at} < ${overdueThreshold} then 1 end)`,
      })
      .from(borrowingsTable)
      .where(eq(borrowingsTable.user_id, userId))
      .execute();

    return {
      total_documents: Number(bukuTanahCount.count) + Number(suratUkurCount.count) + Number(warkahCount.count),
      total_users: 1, // Only the user themselves
      total_borrowings: userBorrowingStats ? Number(userBorrowingStats.total_borrowings) : 0,
      active_borrowings: userBorrowingStats ? Number(userBorrowingStats.active_borrowings) : 0,
      overdue_borrowings: userBorrowingStats ? Number(userBorrowingStats.overdue_borrowings) : 0,
    };
  } catch (error) {
    console.error('User dashboard stats generation failed:', error);
    throw error;
  }
}

export async function getKepalaSeccionDashboardStats(sectionUsers: number[]): Promise<DashboardStats> {
  try {
    // Calculate overdue threshold (30 days ago)
    const overdueThreshold = new Date();
    overdueThreshold.setDate(overdueThreshold.getDate() - 30);

    // Get document counts (all documents available for management)
    const [bukuTanahCount] = await db.select({ count: count() }).from(bukuTanahTable).execute();
    const [suratUkurCount] = await db.select({ count: count() }).from(suratUkurTable).execute();
    const [warkahCount] = await db.select({ count: count() }).from(warkahTable).execute();

    // Get section-specific borrowing statistics
    let sectionBorrowingStats = {
      total_borrowings: 0,
      active_borrowings: 0,
      overdue_borrowings: 0,
    };

    if (sectionUsers.length > 0) {
      const [stats] = await db
        .select({
          total_borrowings: count(borrowingsTable.id),
          active_borrowings: sql<number>`count(case when ${borrowingsTable.status} = 'borrowed' then 1 end)`,
          overdue_borrowings: sql<number>`count(case when ${borrowingsTable.status} = 'borrowed' and ${borrowingsTable.borrowed_at} < ${overdueThreshold} then 1 end)`,
        })
        .from(borrowingsTable)
        .where(inArray(borrowingsTable.user_id, sectionUsers))
        .execute();

      if (stats) {
        sectionBorrowingStats = {
          total_borrowings: Number(stats.total_borrowings),
          active_borrowings: Number(stats.active_borrowings),
          overdue_borrowings: Number(stats.overdue_borrowings),
        };
      }
    }

    return {
      total_documents: Number(bukuTanahCount.count) + Number(suratUkurCount.count) + Number(warkahCount.count),
      total_users: sectionUsers.length,
      total_borrowings: sectionBorrowingStats.total_borrowings,
      active_borrowings: sectionBorrowingStats.active_borrowings,
      overdue_borrowings: sectionBorrowingStats.overdue_borrowings,
    };
  } catch (error) {
    console.error('Kepala seksi dashboard stats generation failed:', error);
    throw error;
  }
}