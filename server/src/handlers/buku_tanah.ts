import { db } from '../db';
import { bukuTanahTable, borrowingsTable } from '../db/schema';
import { type CreateBukuTanahInput, type UpdateBukuTanahInput, type BukuTanah } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createBukuTanah(input: CreateBukuTanahInput): Promise<BukuTanah> {
  try {
    // Insert new buku tanah record
    const result = await db.insert(bukuTanahTable)
      .values({
        nomor_hak: input.nomor_hak,
        nama_pemilik: input.nama_pemilik,
        desa: input.desa,
        kecamatan: input.kecamatan
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Buku Tanah creation failed:', error);
    throw error;
  }
}

export async function updateBukuTanah(input: UpdateBukuTanahInput): Promise<BukuTanah> {
  try {
    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date()
    };

    if (input.nomor_hak !== undefined) {
      updateData['nomor_hak'] = input.nomor_hak;
    }
    if (input.nama_pemilik !== undefined) {
      updateData['nama_pemilik'] = input.nama_pemilik;
    }
    if (input.desa !== undefined) {
      updateData['desa'] = input.desa;
    }
    if (input.kecamatan !== undefined) {
      updateData['kecamatan'] = input.kecamatan;
    }

    // Update the buku tanah record
    const result = await db.update(bukuTanahTable)
      .set(updateData)
      .where(eq(bukuTanahTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Buku Tanah with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Buku Tanah update failed:', error);
    throw error;
  }
}

export async function getBukuTanahList(): Promise<BukuTanah[]> {
  try {
    const results = await db.select()
      .from(bukuTanahTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Buku Tanah list fetch failed:', error);
    throw error;
  }
}

export async function getBukuTanahById(id: number): Promise<BukuTanah | null> {
  try {
    const results = await db.select()
      .from(bukuTanahTable)
      .where(eq(bukuTanahTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Buku Tanah fetch by id failed:', error);
    throw error;
  }
}

export async function deleteBukuTanah(id: number): Promise<boolean> {
  try {
    // Check if there are any active borrowings for this document
    const activeBorrowings = await db.select()
      .from(borrowingsTable)
      .where(
        and(
          eq(borrowingsTable.document_type, 'buku_tanah'),
          eq(borrowingsTable.document_id, id),
          eq(borrowingsTable.status, 'borrowed')
        )
      )
      .execute();

    if (activeBorrowings.length > 0) {
      throw new Error('Cannot delete Buku Tanah with active borrowings');
    }

    // Delete the buku tanah record
    const result = await db.delete(bukuTanahTable)
      .where(eq(bukuTanahTable.id, id))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Buku Tanah deletion failed:', error);
    throw error;
  }
}