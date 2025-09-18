import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { bukuTanahTable, borrowingsTable, usersTable } from '../db/schema';
import { type CreateBukuTanahInput, type UpdateBukuTanahInput } from '../schema';
import { 
  createBukuTanah, 
  updateBukuTanah, 
  getBukuTanahList, 
  getBukuTanahById, 
  deleteBukuTanah 
} from '../handlers/buku_tanah';
import { eq, and } from 'drizzle-orm';

// Test data
const testInput: CreateBukuTanahInput = {
  nomor_hak: 'BT001',
  nama_pemilik: 'John Doe',
  desa: 'Desa Test',
  kecamatan: 'Kecamatan Test'
};

const testInput2: CreateBukuTanahInput = {
  nomor_hak: 'BT002',
  nama_pemilik: 'Jane Smith',
  desa: 'Desa Test 2',
  kecamatan: 'Kecamatan Test 2'
};

describe('createBukuTanah', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a buku tanah document', async () => {
    const result = await createBukuTanah(testInput);

    expect(result.nomor_hak).toEqual('BT001');
    expect(result.nama_pemilik).toEqual('John Doe');
    expect(result.desa).toEqual('Desa Test');
    expect(result.kecamatan).toEqual('Kecamatan Test');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save buku tanah to database', async () => {
    const result = await createBukuTanah(testInput);

    const documents = await db.select()
      .from(bukuTanahTable)
      .where(eq(bukuTanahTable.id, result.id))
      .execute();

    expect(documents).toHaveLength(1);
    expect(documents[0].nomor_hak).toEqual('BT001');
    expect(documents[0].nama_pemilik).toEqual('John Doe');
    expect(documents[0].desa).toEqual('Desa Test');
    expect(documents[0].kecamatan).toEqual('Kecamatan Test');
  });

  it('should throw error for duplicate nomor_hak', async () => {
    await createBukuTanah(testInput);

    // Attempt to create another with same nomor_hak
    await expect(createBukuTanah(testInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });
});

describe('updateBukuTanah', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update existing buku tanah', async () => {
    const created = await createBukuTanah(testInput);
    
    const updateInput: UpdateBukuTanahInput = {
      id: created.id,
      nama_pemilik: 'John Doe Updated',
      desa: 'Desa Updated'
    };

    const result = await updateBukuTanah(updateInput);

    expect(result.id).toEqual(created.id);
    expect(result.nomor_hak).toEqual('BT001'); // unchanged
    expect(result.nama_pemilik).toEqual('John Doe Updated');
    expect(result.desa).toEqual('Desa Updated');
    expect(result.kecamatan).toEqual('Kecamatan Test'); // unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated data to database', async () => {
    const created = await createBukuTanah(testInput);
    
    const updateInput: UpdateBukuTanahInput = {
      id: created.id,
      nama_pemilik: 'Updated Owner'
    };

    await updateBukuTanah(updateInput);

    const documents = await db.select()
      .from(bukuTanahTable)
      .where(eq(bukuTanahTable.id, created.id))
      .execute();

    expect(documents[0].nama_pemilik).toEqual('Updated Owner');
  });

  it('should throw error for non-existent id', async () => {
    const updateInput: UpdateBukuTanahInput = {
      id: 999,
      nama_pemilik: 'Non-existent'
    };

    await expect(updateBukuTanah(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should throw error for duplicate nomor_hak when updating', async () => {
    const doc1 = await createBukuTanah(testInput);
    const doc2 = await createBukuTanah(testInput2);

    const updateInput: UpdateBukuTanahInput = {
      id: doc2.id,
      nomor_hak: doc1.nomor_hak // Try to use existing nomor_hak
    };

    await expect(updateBukuTanah(updateInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });
});

describe('getBukuTanahList', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no documents exist', async () => {
    const result = await getBukuTanahList();
    expect(result).toHaveLength(0);
  });

  it('should return all buku tanah documents', async () => {
    await createBukuTanah(testInput);
    await createBukuTanah(testInput2);

    const result = await getBukuTanahList();

    expect(result).toHaveLength(2);
    expect(result[0].nomor_hak).toEqual('BT001');
    expect(result[1].nomor_hak).toEqual('BT002');
  });

  it('should return documents with all required fields', async () => {
    await createBukuTanah(testInput);

    const result = await getBukuTanahList();

    expect(result[0].id).toBeDefined();
    expect(result[0].nomor_hak).toBeDefined();
    expect(result[0].nama_pemilik).toBeDefined();
    expect(result[0].desa).toBeDefined();
    expect(result[0].kecamatan).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });
});

describe('getBukuTanahById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent id', async () => {
    const result = await getBukuTanahById(999);
    expect(result).toBeNull();
  });

  it('should return buku tanah document by id', async () => {
    const created = await createBukuTanah(testInput);

    const result = await getBukuTanahById(created.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(created.id);
    expect(result!.nomor_hak).toEqual('BT001');
    expect(result!.nama_pemilik).toEqual('John Doe');
    expect(result!.desa).toEqual('Desa Test');
    expect(result!.kecamatan).toEqual('Kecamatan Test');
  });
});

describe('deleteBukuTanah', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return false for non-existent id', async () => {
    const result = await deleteBukuTanah(999);
    expect(result).toBe(false);
  });

  it('should delete existing buku tanah document', async () => {
    const created = await createBukuTanah(testInput);

    const result = await deleteBukuTanah(created.id);

    expect(result).toBe(true);

    // Verify deletion
    const found = await getBukuTanahById(created.id);
    expect(found).toBeNull();
  });

  it('should remove document from database', async () => {
    const created = await createBukuTanah(testInput);

    await deleteBukuTanah(created.id);

    const documents = await db.select()
      .from(bukuTanahTable)
      .where(eq(bukuTanahTable.id, created.id))
      .execute();

    expect(documents).toHaveLength(0);
  });

  it('should throw error when deleting document with active borrowings', async () => {
    // Create a user first
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password123',
        full_name: 'Test User',
        role: 'user'
      })
      .returning()
      .execute();

    // Create a buku tanah document
    const document = await createBukuTanah(testInput);

    // Create an active borrowing
    await db.insert(borrowingsTable)
      .values({
        user_id: user[0].id,
        document_type: 'buku_tanah',
        document_id: document.id,
        status: 'borrowed'
      })
      .execute();

    // Attempt to delete should fail
    await expect(deleteBukuTanah(document.id)).rejects.toThrow(/cannot delete.*active borrowings/i);
  });

  it('should allow deletion when borrowing is returned', async () => {
    // Create a user first
    const user = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password123',
        full_name: 'Test User',
        role: 'user'
      })
      .returning()
      .execute();

    // Create a buku tanah document
    const document = await createBukuTanah(testInput);

    // Create a returned borrowing
    await db.insert(borrowingsTable)
      .values({
        user_id: user[0].id,
        document_type: 'buku_tanah',
        document_id: document.id,
        status: 'returned',
        returned_at: new Date()
      })
      .execute();

    // Deletion should succeed
    const result = await deleteBukuTanah(document.id);
    expect(result).toBe(true);
  });
});