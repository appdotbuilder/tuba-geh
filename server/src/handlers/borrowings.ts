import { db } from '../db';
import { 
  borrowingsTable, 
  usersTable, 
  bukuTanahTable, 
  suratUkurTable, 
  warkahTable 
} from '../db/schema';
import { type CreateBorrowingInput, type ReturnBorrowingInput, type Borrowing } from '../schema';
import { eq, and, isNull, lt, desc, SQL } from 'drizzle-orm';

export async function createBorrowing(input: CreateBorrowingInput): Promise<Borrowing> {
  try {
    // First validate that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Validate that the document exists based on document type
    let documentExists = false;
    switch (input.document_type) {
      case 'buku_tanah':
        const bukuTanah = await db.select()
          .from(bukuTanahTable)
          .where(eq(bukuTanahTable.id, input.document_id))
          .execute();
        documentExists = bukuTanah.length > 0;
        break;
      case 'surat_ukur':
        const suratUkur = await db.select()
          .from(suratUkurTable)
          .where(eq(suratUkurTable.id, input.document_id))
          .execute();
        documentExists = suratUkur.length > 0;
        break;
      case 'warkah':
        const warkah = await db.select()
          .from(warkahTable)
          .where(eq(warkahTable.id, input.document_id))
          .execute();
        documentExists = warkah.length > 0;
        break;
    }

    if (!documentExists) {
      throw new Error('Document not found');
    }

    // Check if document is already borrowed (not returned)
    const existingBorrowing = await db.select()
      .from(borrowingsTable)
      .where(
        and(
          eq(borrowingsTable.document_type, input.document_type),
          eq(borrowingsTable.document_id, input.document_id),
          eq(borrowingsTable.status, 'borrowed')
        )
      )
      .execute();

    if (existingBorrowing.length > 0) {
      throw new Error('Document is already borrowed');
    }

    // Create the borrowing record
    const result = await db.insert(borrowingsTable)
      .values({
        user_id: input.user_id,
        document_type: input.document_type,
        document_id: input.document_id,
        status: 'borrowed',
        notes: input.notes || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Borrowing creation failed:', error);
    throw error;
  }
}

export async function returnBorrowing(input: ReturnBorrowingInput): Promise<Borrowing> {
  try {
    // Check if borrowing exists and is currently borrowed
    const existingBorrowing = await db.select()
      .from(borrowingsTable)
      .where(
        and(
          eq(borrowingsTable.id, input.id),
          eq(borrowingsTable.status, 'borrowed')
        )
      )
      .execute();

    if (existingBorrowing.length === 0) {
      throw new Error('Borrowing not found or already returned');
    }

    // Update the borrowing record to returned
    const result = await db.update(borrowingsTable)
      .set({
        status: 'returned',
        returned_at: new Date(),
        notes: input.notes || existingBorrowing[0].notes,
        updated_at: new Date()
      })
      .where(eq(borrowingsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Borrowing return failed:', error);
    throw error;
  }
}

export async function getBorrowings(): Promise<Borrowing[]> {
  try {
    const result = await db.select()
      .from(borrowingsTable)
      .orderBy(desc(borrowingsTable.created_at))
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch borrowings:', error);
    throw error;
  }
}

export async function getBorrowingsByUserId(userId: number): Promise<Borrowing[]> {
  try {
    const result = await db.select()
      .from(borrowingsTable)
      .where(eq(borrowingsTable.user_id, userId))
      .orderBy(desc(borrowingsTable.created_at))
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch user borrowings:', error);
    throw error;
  }
}

export async function getActiveBorrowings(): Promise<Borrowing[]> {
  try {
    const result = await db.select()
      .from(borrowingsTable)
      .where(eq(borrowingsTable.status, 'borrowed'))
      .orderBy(desc(borrowingsTable.borrowed_at))
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch active borrowings:', error);
    throw error;
  }
}

export async function getOverdueBorrowings(): Promise<Borrowing[]> {
  try {
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await db.select()
      .from(borrowingsTable)
      .where(
        and(
          eq(borrowingsTable.status, 'borrowed'),
          lt(borrowingsTable.borrowed_at, thirtyDaysAgo)
        )
      )
      .orderBy(desc(borrowingsTable.borrowed_at))
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch overdue borrowings:', error);
    throw error;
  }
}

export async function getBorrowingById(id: number): Promise<Borrowing | null> {
  try {
    const result = await db.select()
      .from(borrowingsTable)
      .where(eq(borrowingsTable.id, id))
      .execute();

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Failed to fetch borrowing by ID:', error);
    throw error;
  }
}