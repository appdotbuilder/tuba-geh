import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type LoginInput, type User } from '../schema';

export async function login(input: LoginInput): Promise<User | null> {
  try {
    // Query user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      return null; // User not found
    }

    const user = users[0];

    // Verify password (in real app, you'd use bcrypt.compare)
    if (user.password !== input.password) {
      return null; // Invalid password
    }

    // Return user without password for security
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

export async function getCurrentUser(userId: number): Promise<User | null> {
  try {
    // Query user by ID
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (users.length === 0) {
      return null; // User not found
    }

    const user = users[0];

    // Return user without password for security
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  } catch (error) {
    console.error('Get current user failed:', error);
    throw error;
  }
}