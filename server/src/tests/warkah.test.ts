import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { warkahTable, borrowingsTable, usersTable } from '../db/schema';
import { type CreateWarkahInput, type UpdateWarkahInput } from '../schema';
import {
  createWarkah,
  updateWarkah,
  getWarkahList,
  getWarkahById,
  deleteWarkah
} from '../handlers/warkah';
import { eq, and } from 'drizzle-orm';

// Test input data
const testCreateInput: CreateWarkahInput = {
  nomor_hak: 'WH-001/2024',
  desa: 'Sukamaju',
  kecamatan: 'Bandung Utara',
  di_208: 'DI-208-001'
};

const testUpdateInput: UpdateWarkahInput = {
  id: 1,
  nomor_hak: 'WH-001-UPDATED/2024',
  desa: 'Sukamaju Baru',
  kecamatan: 'Bandung Selatan',
  di_208: 'DI-208-002'
};

describe('createWarkah', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a warkah document', async () => {
    const result = await createWarkah(testCreateInput);

    expect(result.nomor_hak).toEqual('WH-001/2024');
    expect(result.desa).toEqual('Sukamaju');
    expect(result.kecamatan).toEqual('Bandung Utara');
    expect(result.di_208).toEqual('DI-208-001');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save warkah to database', async () => {
    const result = await createWarkah(testCreateInput);

    const savedWarkah = await db.select()
      .from(warkahTable)
      .where(eq(warkahTable.id, result.id))
      .execute();

    expect(savedWarkah).toHaveLength(1);
    expect(savedWarkah[0].nomor_hak).toEqual('WH-001/2024');
    expect(savedWarkah[0].desa).toEqual('Sukamaju');
    expect(savedWarkah[0].kecamatan).toEqual('Bandung Utara');
    expect(savedWarkah[0].di_208).toEqual('DI-208-001');
  });

  it('should reject duplicate nomor_hak', async () => {
    await createWarkah(testCreateInput);
    
    await expect(createWarkah(testCreateInput)).rejects.toThrow(/unique/i);
  });
});

describe('updateWarkah', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update existing warkah', async () => {
    const created = await createWarkah(testCreateInput);
    const updateInput = { ...testUpdateInput, id: created.id };

    const result = await updateWarkah(updateInput);

    expect(result.id).toEqual(created.id);
    expect(result.nomor_hak).toEqual('WH-001-UPDATED/2024');
    expect(result.desa).toEqual('Sukamaju Baru');
    expect(result.kecamatan).toEqual('Bandung Selatan');
    expect(result.di_208).toEqual('DI-208-002');
    expect(result.updated_at.getTime()).toBeGreaterThan(result.created_at.getTime());
  });

  it('should update only provided fields', async () => {
    const created = await createWarkah(testCreateInput);
    const partialUpdate = {
      id: created.id,
      nomor_hak: 'WH-PARTIAL-UPDATE/2024'
    };

    const result = await updateWarkah(partialUpdate);

    expect(result.nomor_hak).toEqual('WH-PARTIAL-UPDATE/2024');
    expect(result.desa).toEqual('Sukamaju'); // Should remain unchanged
    expect(result.kecamatan).toEqual('Bandung Utara'); // Should remain unchanged
    expect(result.di_208).toEqual('DI-208-001'); // Should remain unchanged
  });

  it('should throw error for non-existent warkah', async () => {
    const nonExistentUpdate = { ...testUpdateInput, id: 999 };

    await expect(updateWarkah(nonExistentUpdate)).rejects.toThrow(/not found/i);
  });

  it('should reject duplicate nomor_hak when updating', async () => {
    const first = await createWarkah(testCreateInput);
    const second = await createWarkah({
      nomor_hak: 'WH-002/2024',
      desa: 'Desa Lain',
      kecamatan: 'Kecamatan Lain',
      di_208: 'DI-208-999'
    });

    // Try to update second warkah with first's nomor_hak
    const duplicateUpdate = {
      id: second.id,
      nomor_hak: first.nomor_hak
    };

    await expect(updateWarkah(duplicateUpdate)).rejects.toThrow(/unique/i);
  });
});

describe('getWarkahList', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no warkah exists', async () => {
    const results = await getWarkahList();
    expect(results).toHaveLength(0);
  });

  it('should return all warkah documents', async () => {
    await createWarkah(testCreateInput);
    await createWarkah({
      nomor_hak: 'WH-002/2024',
      desa: 'Desa Kedua',
      kecamatan: 'Kecamatan Kedua',
      di_208: 'DI-208-002'
    });

    const results = await getWarkahList();

    expect(results).toHaveLength(2);
    expect(results[0].nomor_hak).toEqual('WH-001/2024');
    expect(results[1].nomor_hak).toEqual('WH-002/2024');
  });

  it('should return warkah ordered by creation date', async () => {
    // Create first warkah
    await createWarkah(testCreateInput);
    
    // Wait a small amount to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Create second warkah
    await createWarkah({
      nomor_hak: 'WH-002/2024',
      desa: 'Desa Kedua',
      kecamatan: 'Kecamatan Kedua',
      di_208: 'DI-208-002'
    });

    const results = await getWarkahList();

    expect(results).toHaveLength(2);
    expect(results[0].created_at.getTime()).toBeLessThanOrEqual(results[1].created_at.getTime());
  });
});

describe('getWarkahById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return warkah by id', async () => {
    const created = await createWarkah(testCreateInput);

    const result = await getWarkahById(created.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(created.id);
    expect(result!.nomor_hak).toEqual('WH-001/2024');
    expect(result!.desa).toEqual('Sukamaju');
    expect(result!.kecamatan).toEqual('Bandung Utara');
    expect(result!.di_208).toEqual('DI-208-001');
  });

  it('should return null for non-existent id', async () => {
    const result = await getWarkahById(999);
    expect(result).toBeNull();
  });
});

describe('deleteWarkah', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete existing warkah', async () => {
    const created = await createWarkah(testCreateInput);

    const result = await deleteWarkah(created.id);

    expect(result).toBe(true);

    // Verify it's deleted from database
    const deleted = await getWarkahById(created.id);
    expect(deleted).toBeNull();
  });

  it('should return false for non-existent warkah', async () => {
    const result = await deleteWarkah(999);
    expect(result).toBe(false);
  });

  it('should prevent deletion when warkah has active borrowings', async () => {
    // Create prerequisite user
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password',
        full_name: 'Test User',
        role: 'user'
      })
      .returning()
      .execute();

    const created = await createWarkah(testCreateInput);

    // Create active borrowing
    await db.insert(borrowingsTable)
      .values({
        user_id: user[0].id,
        document_type: 'warkah',
        document_id: created.id,
        status: 'borrowed',
        notes: 'Test borrowing'
      })
      .execute();

    await expect(deleteWarkah(created.id)).rejects.toThrow(/active borrowings/i);
  });

  it('should allow deletion when borrowings are returned', async () => {
    // Create prerequisite user
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password',
        full_name: 'Test User',
        role: 'user'
      })
      .returning()
      .execute();

    const created = await createWarkah(testCreateInput);

    // Create returned borrowing
    await db.insert(borrowingsTable)
      .values({
        user_id: user[0].id,
        document_type: 'warkah',
        document_id: created.id,
        status: 'returned',
        returned_at: new Date(),
        notes: 'Test borrowing - returned'
      })
      .execute();

    const result = await deleteWarkah(created.id);

    expect(result).toBe(true);

    // Verify it's deleted from database
    const deleted = await getWarkahById(created.id);
    expect(deleted).toBeNull();
  });
});