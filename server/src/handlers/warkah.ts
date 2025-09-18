import { db } from '../db';
import { warkahTable, borrowingsTable } from '../db/schema';
import { type CreateWarkahInput, type UpdateWarkahInput, type Warkah } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createWarkah(input: CreateWarkahInput): Promise<Warkah> {
  try {
    // Insert new warkah record
    const result = await db.insert(warkahTable)
      .values({
        nomor_hak: input.nomor_hak,
        desa: input.desa,
        kecamatan: input.kecamatan,
        di_208: input.di_208
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Warkah creation failed:', error);
    throw error;
  }
}

export async function updateWarkah(input: UpdateWarkahInput): Promise<Warkah> {
  try {
    // Build update values object with only defined fields
    const updateValues: Record<string, any> = {
      updated_at: new Date()
    };

    if (input.nomor_hak !== undefined) {
      updateValues['nomor_hak'] = input.nomor_hak;
    }
    if (input.desa !== undefined) {
      updateValues['desa'] = input.desa;
    }
    if (input.kecamatan !== undefined) {
      updateValues['kecamatan'] = input.kecamatan;
    }
    if (input.di_208 !== undefined) {
      updateValues['di_208'] = input.di_208;
    }

    // Update warkah record
    const result = await db.update(warkahTable)
      .set(updateValues)
      .where(eq(warkahTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Warkah with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Warkah update failed:', error);
    throw error;
  }
}

export async function getWarkahList(): Promise<Warkah[]> {
  try {
    const results = await db.select()
      .from(warkahTable)
      .orderBy(warkahTable.created_at)
      .execute();

    return results;
  } catch (error) {
    console.error('Warkah list retrieval failed:', error);
    throw error;
  }
}

export async function getWarkahById(id: number): Promise<Warkah | null> {
  try {
    const results = await db.select()
      .from(warkahTable)
      .where(eq(warkahTable.id, id))
      .execute();

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Warkah retrieval failed:', error);
    throw error;
  }
}

export async function deleteWarkah(id: number): Promise<boolean> {
  try {
    // Check if warkah has any active borrowings
    const activeBorrowings = await db.select()
      .from(borrowingsTable)
      .where(
        and(
          eq(borrowingsTable.document_type, 'warkah'),
          eq(borrowingsTable.document_id, id),
          eq(borrowingsTable.status, 'borrowed')
        )
      )
      .execute();

    if (activeBorrowings.length > 0) {
      throw new Error('Cannot delete warkah with active borrowings');
    }

    // Delete the warkah record
    const result = await db.delete(warkahTable)
      .where(eq(warkahTable.id, id))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Warkah deletion failed:', error);
    throw error;
  }
}