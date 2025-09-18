import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { suratUkurTable, usersTable, borrowingsTable } from '../db/schema';
import { type CreateSuratUkurInput, type UpdateSuratUkurInput } from '../schema';
import { 
  createSuratUkur, 
  updateSuratUkur, 
  getSuratUkurList, 
  getSuratUkurById, 
  deleteSuratUkur 
} from '../handlers/surat_ukur';
import { eq, and } from 'drizzle-orm';

// Test inputs
const testCreateInput: CreateSuratUkurInput = {
  nomor_su: 'SU-001/2023',
  tahun: 2023,
  luas: 1000.50,
  desa: 'Desa Makmur'
};

const testUpdateInput: UpdateSuratUkurInput = {
  id: 1,
  nomor_su: 'SU-001/2024',
  tahun: 2024,
  luas: 1500.75,
  desa: 'Desa Sejahtera'
};

describe('Surat Ukur Handlers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('createSuratUkur', () => {
    it('should create a surat ukur successfully', async () => {
      const result = await createSuratUkur(testCreateInput);

      expect(result.nomor_su).toEqual('SU-001/2023');
      expect(result.tahun).toEqual(2023);
      expect(result.luas).toEqual(1000.50);
      expect(typeof result.luas).toEqual('number');
      expect(result.desa).toEqual('Desa Makmur');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should save surat ukur to database', async () => {
      const result = await createSuratUkur(testCreateInput);

      const records = await db.select()
        .from(suratUkurTable)
        .where(eq(suratUkurTable.id, result.id))
        .execute();

      expect(records).toHaveLength(1);
      expect(records[0].nomor_su).toEqual('SU-001/2023');
      expect(records[0].tahun).toEqual(2023);
      expect(parseFloat(records[0].luas)).toEqual(1000.50);
      expect(records[0].desa).toEqual('Desa Makmur');
      expect(records[0].created_at).toBeInstanceOf(Date);
    });

    it('should handle duplicate nomor_su constraint', async () => {
      await createSuratUkur(testCreateInput);

      await expect(createSuratUkur(testCreateInput))
        .rejects.toThrow(/duplicate key value violates unique constraint|unique constraint/i);
    });

    it('should handle numeric precision correctly', async () => {
      const precisionInput: CreateSuratUkurInput = {
        nomor_su: 'SU-PRECISION/2023',
        tahun: 2023,
        luas: 1234.5678,
        desa: 'Desa Test'
      };

      const result = await createSuratUkur(precisionInput);

      expect(result.luas).toEqual(1234.57); // Should round to 2 decimal places
      expect(typeof result.luas).toEqual('number');
    });
  });

  describe('updateSuratUkur', () => {
    let createdSuratUkur: any;

    beforeEach(async () => {
      createdSuratUkur = await createSuratUkur(testCreateInput);
    });

    it('should update surat ukur successfully', async () => {
      const updateData = {
        id: createdSuratUkur.id,
        nomor_su: 'SU-UPDATED/2024',
        tahun: 2024,
        luas: 2000.25,
        desa: 'Desa Updated'
      };

      const result = await updateSuratUkur(updateData);

      expect(result.id).toEqual(createdSuratUkur.id);
      expect(result.nomor_su).toEqual('SU-UPDATED/2024');
      expect(result.tahun).toEqual(2024);
      expect(result.luas).toEqual(2000.25);
      expect(typeof result.luas).toEqual('number');
      expect(result.desa).toEqual('Desa Updated');
      expect(result.updated_at.getTime()).toBeGreaterThan(result.created_at.getTime());
    });

    it('should update partial fields only', async () => {
      const partialUpdate = {
        id: createdSuratUkur.id,
        luas: 3000.00
      };

      const result = await updateSuratUkur(partialUpdate);

      expect(result.nomor_su).toEqual(testCreateInput.nomor_su); // Unchanged
      expect(result.tahun).toEqual(testCreateInput.tahun); // Unchanged
      expect(result.luas).toEqual(3000.00); // Updated
      expect(result.desa).toEqual(testCreateInput.desa); // Unchanged
    });

    it('should throw error for non-existent surat ukur', async () => {
      const invalidUpdate = {
        id: 99999,
        nomor_su: 'SU-INVALID/2023'
      };

      await expect(updateSuratUkur(invalidUpdate))
        .rejects.toThrow(/surat ukur not found/i);
    });

    it('should handle duplicate nomor_su on update', async () => {
      // Create another surat ukur
      const anotherInput: CreateSuratUkurInput = {
        nomor_su: 'SU-002/2023',
        tahun: 2023,
        luas: 500.25,
        desa: 'Desa Lain'
      };
      await createSuratUkur(anotherInput);

      // Try to update first surat ukur with second's nomor_su
      const duplicateUpdate = {
        id: createdSuratUkur.id,
        nomor_su: 'SU-002/2023'
      };

      await expect(updateSuratUkur(duplicateUpdate))
        .rejects.toThrow(/duplicate key value violates unique constraint|unique constraint/i);
    });
  });

  describe('getSuratUkurList', () => {
    it('should return empty array when no records exist', async () => {
      const results = await getSuratUkurList();

      expect(results).toEqual([]);
    });

    it('should return all surat ukur records', async () => {
      // Create multiple records
      const input1: CreateSuratUkurInput = {
        nomor_su: 'SU-001/2023',
        tahun: 2023,
        luas: 1000.50,
        desa: 'Desa A'
      };
      const input2: CreateSuratUkurInput = {
        nomor_su: 'SU-002/2023',
        tahun: 2023,
        luas: 2000.25,
        desa: 'Desa B'
      };

      await createSuratUkur(input1);
      await createSuratUkur(input2);

      const results = await getSuratUkurList();

      expect(results).toHaveLength(2);
      
      // Check first record
      const record1 = results.find(r => r.nomor_su === 'SU-001/2023');
      expect(record1).toBeDefined();
      expect(record1!.luas).toEqual(1000.50);
      expect(typeof record1!.luas).toEqual('number');
      
      // Check second record
      const record2 = results.find(r => r.nomor_su === 'SU-002/2023');
      expect(record2).toBeDefined();
      expect(record2!.luas).toEqual(2000.25);
      expect(typeof record2!.luas).toEqual('number');
    });

    it('should return records with correct data types', async () => {
      await createSuratUkur(testCreateInput);

      const results = await getSuratUkurList();

      expect(results).toHaveLength(1);
      expect(typeof results[0].id).toEqual('number');
      expect(typeof results[0].nomor_su).toEqual('string');
      expect(typeof results[0].tahun).toEqual('number');
      expect(typeof results[0].luas).toEqual('number');
      expect(typeof results[0].desa).toEqual('string');
      expect(results[0].created_at).toBeInstanceOf(Date);
      expect(results[0].updated_at).toBeInstanceOf(Date);
    });
  });

  describe('getSuratUkurById', () => {
    let createdSuratUkur: any;

    beforeEach(async () => {
      createdSuratUkur = await createSuratUkur(testCreateInput);
    });

    it('should return surat ukur by id', async () => {
      const result = await getSuratUkurById(createdSuratUkur.id);

      expect(result).toBeDefined();
      expect(result!.id).toEqual(createdSuratUkur.id);
      expect(result!.nomor_su).toEqual('SU-001/2023');
      expect(result!.tahun).toEqual(2023);
      expect(result!.luas).toEqual(1000.50);
      expect(typeof result!.luas).toEqual('number');
      expect(result!.desa).toEqual('Desa Makmur');
    });

    it('should return null for non-existent id', async () => {
      const result = await getSuratUkurById(99999);

      expect(result).toBeNull();
    });

    it('should return record with correct data types', async () => {
      const result = await getSuratUkurById(createdSuratUkur.id);

      expect(result).toBeDefined();
      expect(typeof result!.id).toEqual('number');
      expect(typeof result!.nomor_su).toEqual('string');
      expect(typeof result!.tahun).toEqual('number');
      expect(typeof result!.luas).toEqual('number');
      expect(typeof result!.desa).toEqual('string');
      expect(result!.created_at).toBeInstanceOf(Date);
      expect(result!.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('deleteSuratUkur', () => {
    let createdSuratUkur: any;

    beforeEach(async () => {
      createdSuratUkur = await createSuratUkur(testCreateInput);
    });

    it('should delete surat ukur successfully', async () => {
      const result = await deleteSuratUkur(createdSuratUkur.id);

      expect(result).toBe(true);

      // Verify deletion
      const records = await db.select()
        .from(suratUkurTable)
        .where(eq(suratUkurTable.id, createdSuratUkur.id))
        .execute();

      expect(records).toHaveLength(0);
    });

    it('should return false for non-existent id', async () => {
      const result = await deleteSuratUkur(99999);

      expect(result).toBe(false);
    });

    it('should prevent deletion when active borrowings exist', async () => {
      // Create test user first
      const user = await db.insert(usersTable)
        .values({
          username: 'testuser',
          password: 'password123',
          full_name: 'Test User',
          role: 'user'
        })
        .returning()
        .execute();

      // Create active borrowing
      await db.insert(borrowingsTable)
        .values({
          user_id: user[0].id,
          document_type: 'surat_ukur',
          document_id: createdSuratUkur.id,
          status: 'borrowed'
        })
        .execute();

      // Attempt to delete should fail
      await expect(deleteSuratUkur(createdSuratUkur.id))
        .rejects.toThrow(/cannot delete surat ukur with active borrowings/i);

      // Verify record still exists
      const records = await db.select()
        .from(suratUkurTable)
        .where(eq(suratUkurTable.id, createdSuratUkur.id))
        .execute();

      expect(records).toHaveLength(1);
    });

    it('should allow deletion when borrowings are returned', async () => {
      // Create test user first
      const user = await db.insert(usersTable)
        .values({
          username: 'testuser',
          password: 'password123',
          full_name: 'Test User',
          role: 'user'
        })
        .returning()
        .execute();

      // Create returned borrowing
      await db.insert(borrowingsTable)
        .values({
          user_id: user[0].id,
          document_type: 'surat_ukur',
          document_id: createdSuratUkur.id,
          status: 'returned',
          returned_at: new Date()
        })
        .execute();

      // Deletion should succeed
      const result = await deleteSuratUkur(createdSuratUkur.id);

      expect(result).toBe(true);

      // Verify deletion
      const records = await db.select()
        .from(suratUkurTable)
        .where(eq(suratUkurTable.id, createdSuratUkur.id))
        .execute();

      expect(records).toHaveLength(0);
    });
  });
});