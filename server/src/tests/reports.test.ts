import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import {
  usersTable,
  borrowingsTable,
  bukuTanahTable,
  suratUkurTable,
  warkahTable,
} from '../db/schema';
import {
  getDocumentReport,
  getUserBorrowingReport,
  getOverdueReport,
  getDashboardStats,
  getUserDashboardStats,
  getKepalaSeccionDashboardStats,
} from '../handlers/reports';

describe('Reports', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getDocumentReport', () => {
    it('should return empty report when no borrowings exist', async () => {
      const result = await getDocumentReport();

      expect(result).toHaveLength(3);
      expect(result).toEqual([
        {
          document_type: 'buku_tanah',
          total_borrowed: 0,
          total_returned: 0,
          currently_borrowed: 0,
        },
        {
          document_type: 'surat_ukur',
          total_borrowed: 0,
          total_returned: 0,
          currently_borrowed: 0,
        },
        {
          document_type: 'warkah',
          total_borrowed: 0,
          total_returned: 0,
          currently_borrowed: 0,
        },
      ]);
    });

    it('should generate accurate document borrowing report', async () => {
      // Create test user
      const [user] = await db.insert(usersTable).values({
        username: 'testuser',
        password: 'password123',
        full_name: 'Test User',
        role: 'user',
      }).returning().execute();

      // Create test documents
      const [bukuTanah] = await db.insert(bukuTanahTable).values({
        nomor_hak: 'BT001',
        nama_pemilik: 'Owner 1',
        desa: 'Desa A',
        kecamatan: 'Kec A',
      }).returning().execute();

      const [suratUkur] = await db.insert(suratUkurTable).values({
        nomor_su: 'SU001',
        tahun: 2023,
        luas: '100.50',
        desa: 'Desa B',
      }).returning().execute();

      // Create borrowings with different statuses
      await db.insert(borrowingsTable).values([
        {
          user_id: user.id,
          document_type: 'buku_tanah',
          document_id: bukuTanah.id,
          status: 'borrowed',
        },
        {
          user_id: user.id,
          document_type: 'buku_tanah',
          document_id: bukuTanah.id,
          status: 'returned',
          returned_at: new Date(),
        },
        {
          user_id: user.id,
          document_type: 'surat_ukur',
          document_id: suratUkur.id,
          status: 'borrowed',
        },
      ]).execute();

      const result = await getDocumentReport();

      expect(result).toHaveLength(3);
      
      const bukuTanahReport = result.find(r => r.document_type === 'buku_tanah');
      expect(bukuTanahReport).toEqual({
        document_type: 'buku_tanah',
        total_borrowed: 2,
        total_returned: 1,
        currently_borrowed: 1,
      });

      const suratUkurReport = result.find(r => r.document_type === 'surat_ukur');
      expect(suratUkurReport).toEqual({
        document_type: 'surat_ukur',
        total_borrowed: 1,
        total_returned: 0,
        currently_borrowed: 1,
      });

      const warkahReport = result.find(r => r.document_type === 'warkah');
      expect(warkahReport).toEqual({
        document_type: 'warkah',
        total_borrowed: 0,
        total_returned: 0,
        currently_borrowed: 0,
      });
    });
  });

  describe('getUserBorrowingReport', () => {
    it('should return empty report when no users exist', async () => {
      const result = await getUserBorrowingReport();
      expect(result).toHaveLength(0);
    });

    it('should generate accurate user borrowing report', async () => {
      // Create test users
      const [user1] = await db.insert(usersTable).values({
        username: 'user1',
        password: 'password123',
        full_name: 'User One',
        role: 'user',
      }).returning().execute();

      const [user2] = await db.insert(usersTable).values({
        username: 'user2',
        password: 'password123',
        full_name: 'User Two',
        role: 'user',
      }).returning().execute();

      // Create test document
      const [bukuTanah] = await db.insert(bukuTanahTable).values({
        nomor_hak: 'BT001',
        nama_pemilik: 'Owner 1',
        desa: 'Desa A',
        kecamatan: 'Kec A',
      }).returning().execute();

      // Create overdue borrowing (40 days ago)
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 40);

      await db.insert(borrowingsTable).values([
        {
          user_id: user1.id,
          document_type: 'buku_tanah',
          document_id: bukuTanah.id,
          status: 'borrowed',
          borrowed_at: overdueDate,
        },
        {
          user_id: user1.id,
          document_type: 'buku_tanah',
          document_id: bukuTanah.id,
          status: 'returned',
          returned_at: new Date(),
        },
        {
          user_id: user2.id,
          document_type: 'buku_tanah',
          document_id: bukuTanah.id,
          status: 'borrowed',
        },
      ]).execute();

      const result = await getUserBorrowingReport();

      expect(result).toHaveLength(2);
      
      const user1Report = result.find(r => r.user_id === user1.id);
      expect(user1Report).toEqual({
        user_id: user1.id,
        user_name: 'User One',
        total_borrowings: 2,
        overdue_borrowings: 1,
      });

      const user2Report = result.find(r => r.user_id === user2.id);
      expect(user2Report).toEqual({
        user_id: user2.id,
        user_name: 'User Two',
        total_borrowings: 1,
        overdue_borrowings: 0,
      });
    });
  });

  describe('getOverdueReport', () => {
    it('should return empty report when no overdue borrowings exist', async () => {
      const result = await getOverdueReport();
      expect(result).toHaveLength(0);
    });

    it('should generate accurate overdue report', async () => {
      // Create test user
      const [user] = await db.insert(usersTable).values({
        username: 'testuser',
        password: 'password123',
        full_name: 'Test User',
        role: 'user',
      }).returning().execute();

      // Create test document
      const [bukuTanah] = await db.insert(bukuTanahTable).values({
        nomor_hak: 'BT001',
        nama_pemilik: 'Owner 1',
        desa: 'Desa A',
        kecamatan: 'Kec A',
      }).returning().execute();

      // Create overdue borrowing (40 days ago)
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 40);

      const [borrowing] = await db.insert(borrowingsTable).values({
        user_id: user.id,
        document_type: 'buku_tanah',
        document_id: bukuTanah.id,
        status: 'borrowed',
        borrowed_at: overdueDate,
      }).returning().execute();

      const result = await getOverdueReport();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        user_id: user.id,
        user_name: 'Test User',
        borrowing_id: borrowing.id,
        document_type: 'buku_tanah',
        document_id: bukuTanah.id,
        borrowed_at: overdueDate,
        days_overdue: 10, // 40 - 30 = 10 days overdue
      });
    });

    it('should not include recent borrowings in overdue report', async () => {
      // Create test user and document
      const [user] = await db.insert(usersTable).values({
        username: 'testuser',
        password: 'password123',
        full_name: 'Test User',
        role: 'user',
      }).returning().execute();

      const [bukuTanah] = await db.insert(bukuTanahTable).values({
        nomor_hak: 'BT001',
        nama_pemilik: 'Owner 1',
        desa: 'Desa A',
        kecamatan: 'Kec A',
      }).returning().execute();

      // Create recent borrowing (20 days ago, not overdue)
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 20);

      await db.insert(borrowingsTable).values({
        user_id: user.id,
        document_type: 'buku_tanah',
        document_id: bukuTanah.id,
        status: 'borrowed',
        borrowed_at: recentDate,
      }).execute();

      const result = await getOverdueReport();
      expect(result).toHaveLength(0);
    });
  });

  describe('getDashboardStats', () => {
    it('should return zero stats when no data exists', async () => {
      const result = await getDashboardStats();

      expect(result).toEqual({
        total_documents: 0,
        total_users: 0,
        total_borrowings: 0,
        active_borrowings: 0,
        overdue_borrowings: 0,
      });
    });

    it('should generate accurate dashboard statistics', async () => {
      // Create test users
      const [user1] = await db.insert(usersTable).values({
        username: 'user1',
        password: 'password123',
        full_name: 'User One',
        role: 'user',
      }).returning().execute();

      const [user2] = await db.insert(usersTable).values({
        username: 'user2',
        password: 'password123',
        full_name: 'User Two',
        role: 'admin',
      }).returning().execute();

      // Create test documents
      await db.insert(bukuTanahTable).values([
        {
          nomor_hak: 'BT001',
          nama_pemilik: 'Owner 1',
          desa: 'Desa A',
          kecamatan: 'Kec A',
        },
        {
          nomor_hak: 'BT002',
          nama_pemilik: 'Owner 2',
          desa: 'Desa B',
          kecamatan: 'Kec B',
        },
      ]).execute();

      await db.insert(suratUkurTable).values({
        nomor_su: 'SU001',
        tahun: 2023,
        luas: '100.50',
        desa: 'Desa A',
      }).execute();

      await db.insert(warkahTable).values({
        nomor_hak: 'W001',
        desa: 'Desa A',
        kecamatan: 'Kec A',
        di_208: 'DI001',
      }).execute();

      // Create borrowings
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 40);

      await db.insert(borrowingsTable).values([
        {
          user_id: user1.id,
          document_type: 'buku_tanah',
          document_id: 1,
          status: 'borrowed',
          borrowed_at: overdueDate, // Overdue
        },
        {
          user_id: user1.id,
          document_type: 'surat_ukur',
          document_id: 1,
          status: 'borrowed',
        },
        {
          user_id: user2.id,
          document_type: 'warkah',
          document_id: 1,
          status: 'returned',
          returned_at: new Date(),
        },
      ]).execute();

      const result = await getDashboardStats();

      expect(result).toEqual({
        total_documents: 4, // 2 buku tanah + 1 surat ukur + 1 warkah
        total_users: 2,
        total_borrowings: 3,
        active_borrowings: 2,
        overdue_borrowings: 1,
      });
    });
  });

  describe('getUserDashboardStats', () => {
    it('should return stats for specific user', async () => {
      // Create test user
      const [user] = await db.insert(usersTable).values({
        username: 'testuser',
        password: 'password123',
        full_name: 'Test User',
        role: 'user',
      }).returning().execute();

      // Create test documents
      await db.insert(bukuTanahTable).values({
        nomor_hak: 'BT001',
        nama_pemilik: 'Owner 1',
        desa: 'Desa A',
        kecamatan: 'Kec A',
      }).execute();

      // Create user borrowings
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 40);

      await db.insert(borrowingsTable).values([
        {
          user_id: user.id,
          document_type: 'buku_tanah',
          document_id: 1,
          status: 'borrowed',
          borrowed_at: overdueDate,
        },
        {
          user_id: user.id,
          document_type: 'buku_tanah',
          document_id: 1,
          status: 'returned',
          returned_at: new Date(),
        },
      ]).execute();

      const result = await getUserDashboardStats(user.id);

      expect(result).toEqual({
        total_documents: 1,
        total_users: 1,
        total_borrowings: 2,
        active_borrowings: 1,
        overdue_borrowings: 1,
      });
    });

    it('should return zero borrowing stats for user with no borrowings', async () => {
      // Create test user
      const [user] = await db.insert(usersTable).values({
        username: 'testuser',
        password: 'password123',
        full_name: 'Test User',
        role: 'user',
      }).returning().execute();

      const result = await getUserDashboardStats(user.id);

      expect(result).toEqual({
        total_documents: 0,
        total_users: 1,
        total_borrowings: 0,
        active_borrowings: 0,
        overdue_borrowings: 0,
      });
    });
  });

  describe('getKepalaSeccionDashboardStats', () => {
    it('should return stats for section users', async () => {
      // Create test users
      const [user1] = await db.insert(usersTable).values({
        username: 'user1',
        password: 'password123',
        full_name: 'User One',
        role: 'user',
      }).returning().execute();

      const [user2] = await db.insert(usersTable).values({
        username: 'user2',
        password: 'password123',
        full_name: 'User Two',
        role: 'user',
      }).returning().execute();

      const [user3] = await db.insert(usersTable).values({
        username: 'user3',
        password: 'password123',
        full_name: 'User Three',
        role: 'user',
      }).returning().execute();

      // Create test documents
      await db.insert(bukuTanahTable).values({
        nomor_hak: 'BT001',
        nama_pemilik: 'Owner 1',
        desa: 'Desa A',
        kecamatan: 'Kec A',
      }).execute();

      await db.insert(suratUkurTable).values({
        nomor_su: 'SU001',
        tahun: 2023,
        luas: '100.50',
        desa: 'Desa A',
      }).execute();

      // Create borrowings for section users (user1 and user2)
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 40);

      await db.insert(borrowingsTable).values([
        {
          user_id: user1.id,
          document_type: 'buku_tanah',
          document_id: 1,
          status: 'borrowed',
          borrowed_at: overdueDate,
        },
        {
          user_id: user2.id,
          document_type: 'surat_ukur',
          document_id: 1,
          status: 'borrowed',
        },
        {
          user_id: user3.id, // Not in section
          document_type: 'buku_tanah',
          document_id: 1,
          status: 'borrowed',
        },
      ]).execute();

      const sectionUsers = [user1.id, user2.id];
      const result = await getKepalaSeccionDashboardStats(sectionUsers);

      expect(result).toEqual({
        total_documents: 2,
        total_users: 2,
        total_borrowings: 2, // Only user1 and user2 borrowings
        active_borrowings: 2,
        overdue_borrowings: 1, // Only user1's borrowing is overdue
      });
    });

    it('should handle empty section users array', async () => {
      // Create test documents
      await db.insert(bukuTanahTable).values({
        nomor_hak: 'BT001',
        nama_pemilik: 'Owner 1',
        desa: 'Desa A',
        kecamatan: 'Kec A',
      }).execute();

      const result = await getKepalaSeccionDashboardStats([]);

      expect(result).toEqual({
        total_documents: 1,
        total_users: 0,
        total_borrowings: 0,
        active_borrowings: 0,
        overdue_borrowings: 0,
      });
    });
  });
});