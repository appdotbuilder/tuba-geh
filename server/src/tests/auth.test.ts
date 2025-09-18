import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login, getCurrentUser } from '../handlers/auth';

// Test user data
const testUser = {
  username: 'testuser',
  password: 'testpassword123',
  full_name: 'Test User',
  role: 'user' as const,
};

const adminUser = {
  username: 'admin',
  password: 'adminpass123',
  full_name: 'Admin User',
  role: 'admin' as const,
};

describe('login', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully authenticate valid user', async () => {
    // Create test user
    const insertResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Attempt login
    const loginInput: LoginInput = {
      username: 'testuser',
      password: 'testpassword123',
    };

    const result = await login(loginInput);

    // Verify successful login
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.username).toEqual('testuser');
    expect(result!.full_name).toEqual('Test User');
    expect(result!.role).toEqual('user');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);

    // Ensure password is not returned
    expect((result as any).password).toBeUndefined();
  });

  it('should return null for non-existent user', async () => {
    const loginInput: LoginInput = {
      username: 'nonexistent',
      password: 'anypassword',
    };

    const result = await login(loginInput);

    expect(result).toBeNull();
  });

  it('should return null for incorrect password', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Attempt login with wrong password
    const loginInput: LoginInput = {
      username: 'testuser',
      password: 'wrongpassword',
    };

    const result = await login(loginInput);

    expect(result).toBeNull();
  });

  it('should authenticate different user roles', async () => {
    // Create admin user
    const insertResult = await db.insert(usersTable)
      .values(adminUser)
      .returning()
      .execute();

    const createdAdmin = insertResult[0];

    // Attempt login as admin
    const loginInput: LoginInput = {
      username: 'admin',
      password: 'adminpass123',
    };

    const result = await login(loginInput);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdAdmin.id);
    expect(result!.role).toEqual('admin');
    expect((result as any).password).toBeUndefined();
  });

  it('should handle case-sensitive username', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Attempt login with wrong case
    const loginInput: LoginInput = {
      username: 'TestUser', // Different case
      password: 'testpassword123',
    };

    const result = await login(loginInput);

    expect(result).toBeNull();
  });
});

describe('getCurrentUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user by valid ID', async () => {
    // Create test user
    const insertResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Get user by ID
    const result = await getCurrentUser(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.username).toEqual('testuser');
    expect(result!.full_name).toEqual('Test User');
    expect(result!.role).toEqual('user');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);

    // Ensure password is not returned
    expect((result as any).password).toBeUndefined();
  });

  it('should return null for non-existent user ID', async () => {
    const result = await getCurrentUser(99999);

    expect(result).toBeNull();
  });

  it('should return correct user for different roles', async () => {
    // Create multiple users with different roles
    const userInsertResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const adminInsertResult = await db.insert(usersTable)
      .values(adminUser)
      .returning()
      .execute();

    const createdUser = userInsertResult[0];
    const createdAdmin = adminInsertResult[0];

    // Get regular user
    const userResult = await getCurrentUser(createdUser.id);
    expect(userResult).not.toBeNull();
    expect(userResult!.role).toEqual('user');
    expect(userResult!.username).toEqual('testuser');

    // Get admin user
    const adminResult = await getCurrentUser(createdAdmin.id);
    expect(adminResult).not.toBeNull();
    expect(adminResult!.role).toEqual('admin');
    expect(adminResult!.username).toEqual('admin');

    // Verify both results exclude password
    expect((userResult as any).password).toBeUndefined();
    expect((adminResult as any).password).toBeUndefined();
  });

  it('should handle invalid user ID types gracefully', async () => {
    // Test with negative ID
    const result = await getCurrentUser(-1);
    expect(result).toBeNull();

    // Test with zero ID
    const zeroResult = await getCurrentUser(0);
    expect(zeroResult).toBeNull();
  });
});