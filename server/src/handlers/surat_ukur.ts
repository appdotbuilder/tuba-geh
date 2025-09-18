import { db } from '../db';
import { suratUkurTable, borrowingsTable } from '../db/schema';
import { type CreateSuratUkurInput, type UpdateSuratUkurInput, type SuratUkur } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createSuratUkur(input: CreateSuratUkurInput): Promise<SuratUkur> {
  try {
    // Insert Surat Ukur record
    const result = await db.insert(suratUkurTable)
      .values({
        nomor_su: input.nomor_su,
        tahun: input.tahun,
        luas: input.luas.toString(), // Convert number to string for numeric column
        desa: input.desa
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const suratUkur = result[0];
    return {
      ...suratUkur,
      luas: parseFloat(suratUkur.luas) // Convert string back to number
    };
  } catch (error) {
    console.error('Surat Ukur creation failed:', error);
    throw error;
  }
}

export async function updateSuratUkur(input: UpdateSuratUkurInput): Promise<SuratUkur> {
  try {
    // Check if the Surat Ukur exists
    const existing = await db.select()
      .from(suratUkurTable)
      .where(eq(suratUkurTable.id, input.id))
      .execute();

    if (existing.length === 0) {
      throw new Error('Surat Ukur not found');
    }

    // Build update object only with provided fields
    const updateData: any = {};
    
    if (input.nomor_su !== undefined) {
      updateData.nomor_su = input.nomor_su;
    }
    if (input.tahun !== undefined) {
      updateData.tahun = input.tahun;
    }
    if (input.luas !== undefined) {
      updateData.luas = input.luas.toString(); // Convert number to string for numeric column
    }
    if (input.desa !== undefined) {
      updateData.desa = input.desa;
    }
    
    updateData.updated_at = new Date();

    // Update the record
    const result = await db.update(suratUkurTable)
      .set(updateData)
      .where(eq(suratUkurTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const suratUkur = result[0];
    return {
      ...suratUkur,
      luas: parseFloat(suratUkur.luas) // Convert string back to number
    };
  } catch (error) {
    console.error('Surat Ukur update failed:', error);
    throw error;
  }
}

export async function getSuratUkurList(): Promise<SuratUkur[]> {
  try {
    const results = await db.select()
      .from(suratUkurTable)
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(suratUkur => ({
      ...suratUkur,
      luas: parseFloat(suratUkur.luas) // Convert string back to number
    }));
  } catch (error) {
    console.error('Surat Ukur list retrieval failed:', error);
    throw error;
  }
}

export async function getSuratUkurById(id: number): Promise<SuratUkur | null> {
  try {
    const results = await db.select()
      .from(suratUkurTable)
      .where(eq(suratUkurTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers before returning
    const suratUkur = results[0];
    return {
      ...suratUkur,
      luas: parseFloat(suratUkur.luas) // Convert string back to number
    };
  } catch (error) {
    console.error('Surat Ukur retrieval failed:', error);
    throw error;
  }
}

export async function deleteSuratUkur(id: number): Promise<boolean> {
  try {
    // Check if Surat Ukur exists
    const existing = await db.select()
      .from(suratUkurTable)
      .where(eq(suratUkurTable.id, id))
      .execute();

    if (existing.length === 0) {
      return false;
    }

    // Check for active borrowings
    const activeBorrowings = await db.select()
      .from(borrowingsTable)
      .where(and(
        eq(borrowingsTable.document_type, 'surat_ukur'),
        eq(borrowingsTable.document_id, id),
        eq(borrowingsTable.status, 'borrowed')
      ))
      .execute();

    if (activeBorrowings.length > 0) {
      throw new Error('Cannot delete Surat Ukur with active borrowings');
    }

    // Delete the record
    const result = await db.delete(suratUkurTable)
      .where(eq(suratUkurTable.id, id))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Surat Ukur deletion failed:', error);
    throw error;
  }
}