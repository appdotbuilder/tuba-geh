import { serial, text, pgTable, timestamp, boolean, integer, numeric, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'user', 'kepala_seksi']);
export const documentTypeEnum = pgEnum('document_type', ['buku_tanah', 'surat_ukur', 'warkah']);
export const loanStatusEnum = pgEnum('loan_status', ['active', 'returned']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  role: userRoleEnum('role').notNull(),
  seksi: text('seksi'), // Nullable for kepala_seksi to manage specific seksi
  is_active: boolean('is_active').default(true).notNull(),
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
  is_available: boolean('is_available').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Surat Ukur table
export const suratUkurTable = pgTable('surat_ukur', {
  id: serial('id').primaryKey(),
  nomor_su: text('nomor_su').notNull().unique(),
  tahun: integer('tahun').notNull(),
  luas: numeric('luas', { precision: 12, scale: 2 }).notNull(), // Using numeric for precise area measurements
  desa: text('desa').notNull(),
  is_available: boolean('is_available').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Warkah table
export const warkahTable = pgTable('warkah', {
  id: serial('id').primaryKey(),
  nomor_hak: text('nomor_hak').notNull(),
  desa: text('desa').notNull(),
  kecamatan: text('kecamatan').notNull(),
  di_208: text('di_208').notNull(),
  is_available: boolean('is_available').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Loans table
export const loansTable = pgTable('loans', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  document_type: documentTypeEnum('document_type').notNull(),
  document_id: integer('document_id').notNull(), // References to document tables based on document_type
  loan_date: timestamp('loan_date').defaultNow().notNull(),
  expected_return_date: timestamp('expected_return_date'), // Nullable - no mandatory return date
  actual_return_date: timestamp('actual_return_date'), // Nullable until returned
  status: loanStatusEnum('status').default('active').notNull(),
  notes: text('notes'), // Nullable field for loan notes
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Notifications table
export const notificationsTable = pgTable('notifications', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  loan_id: integer('loan_id').references(() => loansTable.id).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  is_read: boolean('is_read').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  loans: many(loansTable),
  notifications: many(notificationsTable),
}));

export const loansRelations = relations(loansTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [loansTable.user_id],
    references: [usersTable.id],
  }),
  notifications: many(notificationsTable),
}));

export const notificationsRelations = relations(notificationsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [notificationsTable.user_id],
    references: [usersTable.id],
  }),
  loan: one(loansTable, {
    fields: [notificationsTable.loan_id],
    references: [loansTable.id],
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

export type Loan = typeof loansTable.$inferSelect;
export type NewLoan = typeof loansTable.$inferInsert;

export type Notification = typeof notificationsTable.$inferSelect;
export type NewNotification = typeof notificationsTable.$inferInsert;

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  buku_tanah: bukuTanahTable,
  surat_ukur: suratUkurTable,
  warkah: warkahTable,
  loans: loansTable,
  notifications: notificationsTable,
};