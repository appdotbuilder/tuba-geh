import { db } from '../db';
import { usersTable, borrowingsTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput, type User } from '../schema';
import { eq, and, or } from 'drizzle-orm';

// Simple password hashing using built-in crypto (in production, use bcrypt)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    // Hash password before storing
    const hashedPassword = await hashPassword(input.password);
    
    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        password: hashedPassword,
        full_name: input.full_name,
        role: input.role
      })
      .returning()
      .execute();

    const user = result[0];
    
    // Return user without password
    return {
      ...user,
      password: '' // Never return actual password
    };
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}

export async function updateUser(input: UpdateUserInput): Promise<User> {
  try {
    // Build update object dynamically
    const updateData: any = {};
    
    if (input.username !== undefined) {
      updateData.username = input.username;
    }
    
    if (input.password !== undefined) {
      updateData.password = await hashPassword(input.password);
    }
    
    if (input.full_name !== undefined) {
      updateData.full_name = input.full_name;
    }
    
    if (input.role !== undefined) {
      updateData.role = input.role;
    }
    
    // Always update the updated_at timestamp
    updateData.updated_at = new Date();
    
    // Update user record
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('User not found');
    }

    const user = result[0];
    
    // Return user without password
    return {
      ...user,
      password: '' // Never return actual password
    };
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
}

export async function getUsers(): Promise<User[]> {
  try {
    const result = await db.select()
      .from(usersTable)
      .execute();

    // Return users without passwords
    return result.map(user => ({
      ...user,
      password: '' // Never return actual password
    }));
  } catch (error) {
    console.error('Fetching users failed:', error);
    throw error;
  }
}

export async function getUserById(id: number): Promise<User | null> {
  try {
    const result = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .execute();

    if (result.length === 0) {
      return null;
    }

    const user = result[0];
    
    // Return user without password
    return {
      ...user,
      password: '' // Never return actual password
    };
  } catch (error) {
    console.error('Fetching user failed:', error);
    throw error;
  }
}

export async function deleteUser(id: number): Promise<boolean> {
  try {
    // Check if user has active borrowings
    const activeBorrowings = await db.select()
      .from(borrowingsTable)
      .where(
        and(
          eq(borrowingsTable.user_id, id),
          eq(borrowingsTable.status, 'borrowed')
        )
      )
      .execute();

    if (activeBorrowings.length > 0) {
      throw new Error('Cannot delete user with active borrowings');
    }

    // Delete user record
    const result = await db.delete(usersTable)
      .where(eq(usersTable.id, id))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('User deletion failed:', error);
    throw error;
  }
}