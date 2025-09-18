import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  bukuTanahTable, 
  suratUkurTable, 
  warkahTable, 
  borrowingsTable 
} from '../db/schema';
import { 
  type CreateBorrowingInput, 
  type ReturnBorrowingInput 
} from '../schema';
import { 
  createBorrowing,
  returnBorrowing,
  getBorrowings,
  getBorrowingsByUserId,
  getActiveBorrowings,
  getOverdueBorrowings,
  getBorrowingById
} from '../handlers/borrowings';
import { eq } from 'drizzle-orm';

describe('borrowings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data
  let testUserId: number;
  let testBukuTanahId: number;
  let testSuratUkurId: number;
  let testWarkahId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password123',
        full_name: 'Test User',
        role: 'user'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test documents
    const bukuTanahResult = await db.insert(bukuTanahTable)
      .values({
        nomor_hak: 'BT001',
        nama_pemilik: 'John Doe',
        desa: 'Semarang',
        kecamatan: 'Semarang Timur'
      })
      .returning()
      .execute();
    testBukuTanahId = bukuTanahResult[0].id;

    const suratUkurResult = await db.insert(suratUkurTable)
      .values({
        nomor_su: 'SU001',
        tahun: 2023,
        luas: '100.50',
        desa: 'Semarang'
      })
      .returning()
      .execute();
    testSuratUkurId = suratUkurResult[0].id;

    const warkahResult = await db.insert(warkahTable)
      .values({
        nomor_hak: 'WH001',
        desa: 'Semarang',
        kecamatan: 'Semarang Timur',
        di_208: 'DI208001'
      })
      .returning()
      .execute();
    testWarkahId = warkahResult[0].id;
  });

  describe('createBorrowing', () => {
    it('should create a borrowing for buku tanah', async () => {
      const input: CreateBorrowingInput = {
        user_id: testUserId,
        document_type: 'buku_tanah',
        document_id: testBukuTanahId,
        notes: 'Test borrowing'
      };

      const result = await createBorrowing(input);

      expect(result.id).toBeDefined();
      expect(result.user_id).toBe(testUserId);
      expect(result.document_type).toBe('buku_tanah');
      expect(result.document_id).toBe(testBukuTanahId);
      expect(result.status).toBe('borrowed');
      expect(result.notes).toBe('Test borrowing');
      expect(result.borrowed_at).toBeInstanceOf(Date);
      expect(result.returned_at).toBeNull();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should create a borrowing for surat ukur', async () => {
      const input: CreateBorrowingInput = {
        user_id: testUserId,
        document_type: 'surat_ukur',
        document_id: testSuratUkurId
      };

      const result = await createBorrowing(input);

      expect(result.document_type).toBe('surat_ukur');
      expect(result.document_id).toBe(testSuratUkurId);
      expect(result.status).toBe('borrowed');
      expect(result.notes).toBeNull();
    });

    it('should create a borrowing for warkah', async () => {
      const input: CreateBorrowingInput = {
        user_id: testUserId,
        document_type: 'warkah',
        document_id: testWarkahId,
        notes: 'Warkah borrowing'
      };

      const result = await createBorrowing(input);

      expect(result.document_type).toBe('warkah');
      expect(result.document_id).toBe(testWarkahId);
      expect(result.status).toBe('borrowed');
      expect(result.notes).toBe('Warkah borrowing');
    });

    it('should save borrowing to database', async () => {
      const input: CreateBorrowingInput = {
        user_id: testUserId,
        document_type: 'buku_tanah',
        document_id: testBukuTanahId,
        notes: 'Test borrowing'
      };

      const result = await createBorrowing(input);

      const borrowings = await db.select()
        .from(borrowingsTable)
        .where(eq(borrowingsTable.id, result.id))
        .execute();

      expect(borrowings).toHaveLength(1);
      expect(borrowings[0].user_id).toBe(testUserId);
      expect(borrowings[0].document_type).toBe('buku_tanah');
      expect(borrowings[0].document_id).toBe(testBukuTanahId);
      expect(borrowings[0].status).toBe('borrowed');
    });

    it('should throw error for non-existent user', async () => {
      const input: CreateBorrowingInput = {
        user_id: 99999,
        document_type: 'buku_tanah',
        document_id: testBukuTanahId
      };

      await expect(createBorrowing(input)).rejects.toThrow(/user not found/i);
    });

    it('should throw error for non-existent document', async () => {
      const input: CreateBorrowingInput = {
        user_id: testUserId,
        document_type: 'buku_tanah',
        document_id: 99999
      };

      await expect(createBorrowing(input)).rejects.toThrow(/document not found/i);
    });

    it('should throw error when document is already borrowed', async () => {
      const input: CreateBorrowingInput = {
        user_id: testUserId,
        document_type: 'buku_tanah',
        document_id: testBukuTanahId
      };

      // Create first borrowing
      await createBorrowing(input);

      // Try to borrow same document again
      await expect(createBorrowing(input)).rejects.toThrow(/already borrowed/i);
    });
  });

  describe('returnBorrowing', () => {
    let borrowingId: number;

    beforeEach(async () => {
      const input: CreateBorrowingInput = {
        user_id: testUserId,
        document_type: 'buku_tanah',
        document_id: testBukuTanahId,
        notes: 'Initial borrowing'
      };
      const borrowing = await createBorrowing(input);
      borrowingId = borrowing.id;
    });

    it('should return a borrowed document', async () => {
      const input: ReturnBorrowingInput = {
        id: borrowingId,
        notes: 'Returned in good condition'
      };

      const result = await returnBorrowing(input);

      expect(result.id).toBe(borrowingId);
      expect(result.status).toBe('returned');
      expect(result.returned_at).toBeInstanceOf(Date);
      expect(result.notes).toBe('Returned in good condition');
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should return document without additional notes', async () => {
      const input: ReturnBorrowingInput = {
        id: borrowingId
      };

      const result = await returnBorrowing(input);

      expect(result.status).toBe('returned');
      expect(result.notes).toBe('Initial borrowing'); // Should keep original notes
    });

    it('should update database record', async () => {
      const input: ReturnBorrowingInput = {
        id: borrowingId,
        notes: 'Returned successfully'
      };

      await returnBorrowing(input);

      const borrowings = await db.select()
        .from(borrowingsTable)
        .where(eq(borrowingsTable.id, borrowingId))
        .execute();

      expect(borrowings[0].status).toBe('returned');
      expect(borrowings[0].returned_at).toBeInstanceOf(Date);
      expect(borrowings[0].notes).toBe('Returned successfully');
    });

    it('should throw error for non-existent borrowing', async () => {
      const input: ReturnBorrowingInput = {
        id: 99999
      };

      await expect(returnBorrowing(input)).rejects.toThrow(/not found or already returned/i);
    });

    it('should throw error for already returned borrowing', async () => {
      const input: ReturnBorrowingInput = {
        id: borrowingId
      };

      // Return the borrowing first
      await returnBorrowing(input);

      // Try to return again
      await expect(returnBorrowing(input)).rejects.toThrow(/not found or already returned/i);
    });

    it('should allow borrowing same document after return', async () => {
      // Return the document
      await returnBorrowing({ id: borrowingId });

      // Should be able to borrow again
      const newInput: CreateBorrowingInput = {
        user_id: testUserId,
        document_type: 'buku_tanah',
        document_id: testBukuTanahId,
        notes: 'Second borrowing'
      };

      const result = await createBorrowing(newInput);
      expect(result.status).toBe('borrowed');
    });
  });

  describe('getBorrowings', () => {
    beforeEach(async () => {
      // Create multiple borrowings
      await createBorrowing({
        user_id: testUserId,
        document_type: 'buku_tanah',
        document_id: testBukuTanahId
      });
      
      await createBorrowing({
        user_id: testUserId,
        document_type: 'surat_ukur',
        document_id: testSuratUkurId
      });
    });

    it('should get all borrowings', async () => {
      const result = await getBorrowings();

      expect(result).toHaveLength(2);
      expect(result[0].user_id).toBe(testUserId);
      expect(result[1].user_id).toBe(testUserId);
      
      // Check that they are ordered by created_at desc
      expect(result[0].created_at >= result[1].created_at).toBe(true);
    });

    it('should return empty array when no borrowings exist', async () => {
      // Clear existing borrowings
      await db.delete(borrowingsTable).execute();

      const result = await getBorrowings();
      expect(result).toHaveLength(0);
    });
  });

  describe('getBorrowingsByUserId', () => {
    let anotherUserId: number;

    beforeEach(async () => {
      // Create another user
      const userResult = await db.insert(usersTable)
        .values({
          username: 'anotheruser',
          password: 'password123',
          full_name: 'Another User',
          role: 'user'
        })
        .returning()
        .execute();
      anotherUserId = userResult[0].id;

      // Create borrowings for both users
      await createBorrowing({
        user_id: testUserId,
        document_type: 'buku_tanah',
        document_id: testBukuTanahId
      });

      await createBorrowing({
        user_id: anotherUserId,
        document_type: 'surat_ukur',
        document_id: testSuratUkurId
      });
    });

    it('should get borrowings for specific user', async () => {
      const result = await getBorrowingsByUserId(testUserId);

      expect(result).toHaveLength(1);
      expect(result[0].user_id).toBe(testUserId);
      expect(result[0].document_type).toBe('buku_tanah');
    });

    it('should return empty array for user with no borrowings', async () => {
      // Create a third user with no borrowings
      const thirdUserResult = await db.insert(usersTable)
        .values({
          username: 'thirduser',
          password: 'password123',
          full_name: 'Third User',
          role: 'user'
        })
        .returning()
        .execute();

      const result = await getBorrowingsByUserId(thirdUserResult[0].id);
      expect(result).toHaveLength(0);
    });
  });

  describe('getActiveBorrowings', () => {
    beforeEach(async () => {
      // Create active borrowing
      const activeBorrowing = await createBorrowing({
        user_id: testUserId,
        document_type: 'buku_tanah',
        document_id: testBukuTanahId
      });

      // Create and return another borrowing
      const returnedBorrowing = await createBorrowing({
        user_id: testUserId,
        document_type: 'surat_ukur',
        document_id: testSuratUkurId
      });

      await returnBorrowing({ id: returnedBorrowing.id });
    });

    it('should get only active (borrowed) borrowings', async () => {
      const result = await getActiveBorrowings();

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('borrowed');
      expect(result[0].document_type).toBe('buku_tanah');
    });

    it('should return empty array when no active borrowings', async () => {
      // Return all borrowings
      const allBorrowings = await getBorrowings();
      for (const borrowing of allBorrowings) {
        if (borrowing.status === 'borrowed') {
          await returnBorrowing({ id: borrowing.id });
        }
      }

      const result = await getActiveBorrowings();
      expect(result).toHaveLength(0);
    });
  });

  describe('getOverdueBorrowings', () => {
    it('should get overdue borrowings (older than 30 days)', async () => {
      // Create a borrowing and manually set its borrowed_at to 35 days ago
      const borrowing = await createBorrowing({
        user_id: testUserId,
        document_type: 'buku_tanah',
        document_id: testBukuTanahId
      });

      const thirtyFiveDaysAgo = new Date();
      thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);

      await db.update(borrowingsTable)
        .set({ borrowed_at: thirtyFiveDaysAgo })
        .where(eq(borrowingsTable.id, borrowing.id))
        .execute();

      const result = await getOverdueBorrowings();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(borrowing.id);
      expect(result[0].status).toBe('borrowed');
    });

    it('should not include recent borrowings', async () => {
      // Create a recent borrowing (today)
      await createBorrowing({
        user_id: testUserId,
        document_type: 'buku_tanah',
        document_id: testBukuTanahId
      });

      const result = await getOverdueBorrowings();
      expect(result).toHaveLength(0);
    });

    it('should not include returned borrowings even if they were overdue', async () => {
      // Create and return an overdue borrowing
      const borrowing = await createBorrowing({
        user_id: testUserId,
        document_type: 'buku_tanah',
        document_id: testBukuTanahId
      });

      const thirtyFiveDaysAgo = new Date();
      thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);

      await db.update(borrowingsTable)
        .set({ borrowed_at: thirtyFiveDaysAgo })
        .where(eq(borrowingsTable.id, borrowing.id))
        .execute();

      // Return the borrowing
      await returnBorrowing({ id: borrowing.id });

      const result = await getOverdueBorrowings();
      expect(result).toHaveLength(0);
    });
  });

  describe('getBorrowingById', () => {
    let borrowingId: number;

    beforeEach(async () => {
      const borrowing = await createBorrowing({
        user_id: testUserId,
        document_type: 'buku_tanah',
        document_id: testBukuTanahId,
        notes: 'Test borrowing'
      });
      borrowingId = borrowing.id;
    });

    it('should get borrowing by ID', async () => {
      const result = await getBorrowingById(borrowingId);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(borrowingId);
      expect(result!.user_id).toBe(testUserId);
      expect(result!.document_type).toBe('buku_tanah');
      expect(result!.document_id).toBe(testBukuTanahId);
      expect(result!.notes).toBe('Test borrowing');
    });

    it('should return null for non-existent borrowing', async () => {
      const result = await getBorrowingById(99999);
      expect(result).toBeNull();
    });
  });
});