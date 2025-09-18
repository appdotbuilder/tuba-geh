import { serial, text, pgTable, timestamp, integer, numeric, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'user', 'kepala_seksi']);
export const documentTypeEnum = pgEnum('document_type', ['buku_tanah', 'surat_ukur', 'warkah']);
export const borrowingStatusEnum = pgEnum('borrowing_status', ['borrowed', 'returned']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  full_name: text('full_name').notNull(),
  role: userRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Buku Tanah table
export const bukuTanahTable = pgTable('buku_tanah', {
  id: serial('id').primaryKey(),
  nomor_hak: text('nomor_hak').notNull().unique(),
  nama_pemilik: text('nama_pemilik').notNull(),
  desa: text('desa').notNull(),
  kecamatan: text('kecamatan').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Surat Ukur table
export const suratUkurTable = pgTable('surat_ukur', {
  id: serial('id').primaryKey(),
  nomor_su: text('nomor_su').notNull().unique(),
  tahun: integer('tahun').notNull(),
  luas: numeric('luas', { precision: 12, scale: 2 }).notNull(),
  desa: text('desa').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Warkah table
export const warkahTable = pgTable('warkah', {
  id: serial('id').primaryKey(),
  nomor_hak: text('nomor_hak').notNull().unique(),
  desa: text('desa').notNull(),
  kecamatan: text('kecamatan').notNull(),
  di_208: text('di_208').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Borrowings table
export const borrowingsTable = pgTable('borrowings', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  document_type: documentTypeEnum('document_type').notNull(),
  document_id: integer('document_id').notNull(),
  borrowed_at: timestamp('borrowed_at').defaultNow().notNull(),
  returned_at: timestamp('returned_at'),
  status: borrowingStatusEnum('status').notNull().default('borrowed'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Notifications table
export const notificationsTable = pgTable('notifications', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  borrowing_id: integer('borrowing_id').notNull(),
  message: text('message').notNull(),
  is_read: boolean('is_read').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  borrowings: many(borrowingsTable),
  notifications: many(notificationsTable),
}));

export const borrowingsRelations = relations(borrowingsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [borrowingsTable.user_id],
    references: [usersTable.id],
  }),
  notifications: many(notificationsTable),
}));

export const notificationsRelations = relations(notificationsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [notificationsTable.user_id],
    references: [usersTable.id],
  }),
  borrowing: one(borrowingsTable, {
    fields: [notificationsTable.borrowing_id],
    references: [borrowingsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type BukuTanah = typeof bukuTanahTable.$inferSelect;
export type NewBukuTanah = typeof bukuTanahTable.$inferInsert;

export type SuratUkur = typeof suratUkurTable.$inferSelect;
export type NewSuratUkur = typeof suratUkurTable.$inferInsert;

export type Warkah = typeof warkahTable.$inferSelect;
export type NewWarkah = typeof warkahTable.$inferInsert;

export type Borrowing = typeof borrowingsTable.$inferSelect;
export type NewBorrowing = typeof borrowingsTable.$inferInsert;

export type Notification = typeof notificationsTable.$inferSelect;
export type NewNotification = typeof notificationsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  bukuTanah: bukuTanahTable,
  suratUkur: suratUkurTable,
  warkah: warkahTable,
  borrowings: borrowingsTable,
  notifications: notificationsTable,
};