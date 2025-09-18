import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, borrowingsTable } from '../db/schema';
import { type CreateUserInput, type UpdateUserInput } from '../schema';
import { createUser, updateUser, getUsers, getUserById, deleteUser } from '../handlers/users';
import { eq } from 'drizzle-orm';

// Test input for creating users
const testUserInput: CreateUserInput = {
  username: 'testuser',
  password: 'testpass123',
  full_name: 'Test User',
  role: 'user'
};

const adminUserInput: CreateUserInput = {
  username: 'admin',
  password: 'adminpass123',
  full_name: 'Admin User',
  role: 'admin'
};

const kepalaUserInput: CreateUserInput = {
  username: 'kepala',
  password: 'kepalapass123',
  full_name: 'Kepala Seksi',
  role: 'kepala_seksi'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user successfully', async () => {
    const result = await createUser(testUserInput);

    expect(result.id).toBeDefined();
    expect(result.username).toEqual('testuser');
    expect(result.password).toEqual(''); // Password should be empty in response
    expect(result.full_name).toEqual('Test User');
    expect(result.role).toEqual('user');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create users with different roles', async () => {
    const adminResult = await createUser(adminUserInput);
    const kepalaResult = await createUser(kepalaUserInput);

    expect(adminResult.role).toEqual('admin');
    expect(kepalaResult.role).toEqual('kepala_seksi');
  });

  it('should hash password before storing', async () => {
    const result = await createUser(testUserInput);

    // Query database directly to check password is hashed
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].password).not.toEqual('testpass123'); // Password should be hashed
    expect(users[0].password.length).toBeGreaterThan(10); // Hashed password should be longer
  });

  it('should save user to database correctly', async () => {
    const result = await createUser(testUserInput);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testuser');
    expect(users[0].full_name).toEqual('Test User');
    expect(users[0].role).toEqual('user');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for duplicate username', async () => {
    await createUser(testUserInput);
    
    await expect(createUser(testUserInput)).rejects.toThrow(/duplicate/i);
  });
});

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user successfully', async () => {
    const user = await createUser(testUserInput);
    
    const updateInput: UpdateUserInput = {
      id: user.id,
      full_name: 'Updated User Name',
      role: 'admin'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(user.id);
    expect(result.username).toEqual('testuser'); // Unchanged
    expect(result.full_name).toEqual('Updated User Name');
    expect(result.role).toEqual('admin');
    expect(result.password).toEqual(''); // Password should be empty in response
  });

  it('should update only provided fields', async () => {
    const user = await createUser(testUserInput);
    
    const updateInput: UpdateUserInput = {
      id: user.id,
      full_name: 'Only Name Changed'
    };

    const result = await updateUser(updateInput);

    expect(result.full_name).toEqual('Only Name Changed');
    expect(result.username).toEqual('testuser'); // Unchanged
    expect(result.role).toEqual('user'); // Unchanged
  });

  it('should update password and hash it', async () => {
    const user = await createUser(testUserInput);
    
    const updateInput: UpdateUserInput = {
      id: user.id,
      password: 'newpassword123'
    };

    await updateUser(updateInput);

    // Query database directly to check password is hashed
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(users[0].password).not.toEqual('newpassword123');
    expect(users[0].password.length).toBeGreaterThan(10);
  });

  it('should update username successfully', async () => {
    const user = await createUser(testUserInput);
    
    const updateInput: UpdateUserInput = {
      id: user.id,
      username: 'newusername'
    };

    const result = await updateUser(updateInput);

    expect(result.username).toEqual('newusername');
  });

  it('should throw error for non-existent user', async () => {
    const updateInput: UpdateUserInput = {
      id: 999,
      full_name: 'Non-existent User'
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should throw error for duplicate username', async () => {
    const user1 = await createUser(testUserInput);
    const user2 = await createUser({ ...adminUserInput, username: 'user2' });
    
    const updateInput: UpdateUserInput = {
      id: user2.id,
      username: 'testuser' // Try to use user1's username
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/duplicate/i);
  });
});

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    
    expect(result).toEqual([]);
  });

  it('should return all users', async () => {
    await createUser(testUserInput);
    await createUser(adminUserInput);
    
    const result = await getUsers();

    expect(result).toHaveLength(2);
    expect(result[0].username).toEqual('testuser');
    expect(result[1].username).toEqual('admin');
    
    // Check passwords are not returned
    expect(result[0].password).toEqual('');
    expect(result[1].password).toEqual('');
  });

  it('should return users with all fields except password', async () => {
    await createUser(testUserInput);
    
    const result = await getUsers();

    expect(result).toHaveLength(1);
    const user = result[0];
    
    expect(user.id).toBeDefined();
    expect(user.username).toEqual('testuser');
    expect(user.password).toEqual(''); // Should be empty
    expect(user.full_name).toEqual('Test User');
    expect(user.role).toEqual('user');
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });
});

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user by ID', async () => {
    const user = await createUser(testUserInput);
    
    const result = await getUserById(user.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(user.id);
    expect(result!.username).toEqual('testuser');
    expect(result!.password).toEqual(''); // Password should be empty
    expect(result!.full_name).toEqual('Test User');
    expect(result!.role).toEqual('user');
  });

  it('should return null for non-existent user', async () => {
    const result = await getUserById(999);
    
    expect(result).toBeNull();
  });

  it('should return correct user when multiple exist', async () => {
    const user1 = await createUser(testUserInput);
    const user2 = await createUser(adminUserInput);
    
    const result = await getUserById(user2.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(user2.id);
    expect(result!.username).toEqual('admin');
    expect(result!.role).toEqual('admin');
  });
});

describe('deleteUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete user successfully', async () => {
    const user = await createUser(testUserInput);
    
    const result = await deleteUser(user.id);

    expect(result).toBe(true);
    
    // Verify user is deleted
    const deletedUser = await getUserById(user.id);
    expect(deletedUser).toBeNull();
  });

  it('should return false for non-existent user', async () => {
    const result = await deleteUser(999);
    
    expect(result).toBe(false);
  });

  it('should throw error when user has active borrowings', async () => {
    // Create user first
    const user = await createUser(testUserInput);
    
    // Create an active borrowing for the user
    await db.insert(borrowingsTable)
      .values({
        user_id: user.id,
        document_type: 'buku_tanah',
        document_id: 1,
        status: 'borrowed',
        notes: 'Test borrowing'
      })
      .execute();

    await expect(deleteUser(user.id)).rejects.toThrow(/active borrowings/i);
    
    // Verify user is not deleted
    const existingUser = await getUserById(user.id);
    expect(existingUser).not.toBeNull();
  });

  it('should allow deletion when user has returned borrowings', async () => {
    // Create user first
    const user = await createUser(testUserInput);
    
    // Create a returned borrowing for the user
    await db.insert(borrowingsTable)
      .values({
        user_id: user.id,
        document_type: 'buku_tanah',
        document_id: 1,
        status: 'returned',
        returned_at: new Date(),
        notes: 'Test borrowing'
      })
      .execute();

    const result = await deleteUser(user.id);

    expect(result).toBe(true);
    
    // Verify user is deleted
    const deletedUser = await getUserById(user.id);
    expect(deletedUser).toBeNull();
  });

  it('should delete user and verify in database', async () => {
    const user = await createUser(testUserInput);
    
    await deleteUser(user.id);

    // Query database directly to verify deletion
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(users).toHaveLength(0);
  });
});