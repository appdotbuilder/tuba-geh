import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['admin', 'user', 'kepala_seksi']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User schemas
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  password: z.string(),
  full_name: z.string(),
  role: userRoleSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  full_name: z.string().min(1).max(100),
  role: userRoleSchema,
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  username: z.string().min(3).max(50).optional(),
  password: z.string().min(6).optional(),
  full_name: z.string().min(1).max(100).optional(),
  role: userRoleSchema.optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

export const loginInputSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Document type enum
export const documentTypeSchema = z.enum(['buku_tanah', 'surat_ukur', 'warkah']);
export type DocumentType = z.infer<typeof documentTypeSchema>;

// Buku Tanah schemas
export const bukuTanahSchema = z.object({
  id: z.number(),
  nomor_hak: z.string(),
  nama_pemilik: z.string(),
  desa: z.string(),
  kecamatan: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type BukuTanah = z.infer<typeof bukuTanahSchema>;

export const createBukuTanahInputSchema = z.object({
  nomor_hak: z.string().min(1).max(100),
  nama_pemilik: z.string().min(1).max(200),
  desa: z.string().min(1).max(100),
  kecamatan: z.string().min(1).max(100),
});

export type CreateBukuTanahInput = z.infer<typeof createBukuTanahInputSchema>;

export const updateBukuTanahInputSchema = z.object({
  id: z.number(),
  nomor_hak: z.string().min(1).max(100).optional(),
  nama_pemilik: z.string().min(1).max(200).optional(),
  desa: z.string().min(1).max(100).optional(),
  kecamatan: z.string().min(1).max(100).optional(),
});

export type UpdateBukuTanahInput = z.infer<typeof updateBukuTanahInputSchema>;

// Surat Ukur schemas
export const suratUkurSchema = z.object({
  id: z.number(),
  nomor_su: z.string(),
  tahun: z.number().int(),
  luas: z.number(),
  desa: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type SuratUkur = z.infer<typeof suratUkurSchema>;

export const createSuratUkurInputSchema = z.object({
  nomor_su: z.string().min(1).max(100),
  tahun: z.number().int().min(1900).max(2100),
  luas: z.number().positive(),
  desa: z.string().min(1).max(100),
});

export type CreateSuratUkurInput = z.infer<typeof createSuratUkurInputSchema>;

export const updateSuratUkurInputSchema = z.object({
  id: z.number(),
  nomor_su: z.string().min(1).max(100).optional(),
  tahun: z.number().int().min(1900).max(2100).optional(),
  luas: z.number().positive().optional(),
  desa: z.string().min(1).max(100).optional(),
});

export type UpdateSuratUkurInput = z.infer<typeof updateSuratUkurInputSchema>;

// Warkah schemas
export const warkahSchema = z.object({
  id: z.number(),
  nomor_hak: z.string(),
  desa: z.string(),
  kecamatan: z.string(),
  di_208: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Warkah = z.infer<typeof warkahSchema>;

export const createWarkahInputSchema = z.object({
  nomor_hak: z.string().min(1).max(100),
  desa: z.string().min(1).max(100),
  kecamatan: z.string().min(1).max(100),
  di_208: z.string().min(1).max(100),
});

export type CreateWarkahInput = z.infer<typeof createWarkahInputSchema>;

export const updateWarkahInputSchema = z.object({
  id: z.number(),
  nomor_hak: z.string().min(1).max(100).optional(),
  desa: z.string().min(1).max(100).optional(),
  kecamatan: z.string().min(1).max(100).optional(),
  di_208: z.string().min(1).max(100).optional(),
});

export type UpdateWarkahInput = z.infer<typeof updateWarkahInputSchema>;

// Borrowing status enum
export const borrowingStatusSchema = z.enum(['borrowed', 'returned']);
export type BorrowingStatus = z.infer<typeof borrowingStatusSchema>;

// Borrowing schemas
export const borrowingSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  document_type: documentTypeSchema,
  document_id: z.number(),
  borrowed_at: z.coerce.date(),
  returned_at: z.coerce.date().nullable(),
  status: borrowingStatusSchema,
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Borrowing = z.infer<typeof borrowingSchema>;

export const createBorrowingInputSchema = z.object({
  user_id: z.number(),
  document_type: documentTypeSchema,
  document_id: z.number(),
  notes: z.string().nullable().optional(),
});

export type CreateBorrowingInput = z.infer<typeof createBorrowingInputSchema>;

export const returnBorrowingInputSchema = z.object({
  id: z.number(),
  notes: z.string().nullable().optional(),
});

export type ReturnBorrowingInput = z.infer<typeof returnBorrowingInputSchema>;

// Notification schemas
export const notificationSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  borrowing_id: z.number(),
  message: z.string(),
  is_read: z.boolean(),
  created_at: z.coerce.date(),
});

export type Notification = z.infer<typeof notificationSchema>;

export const createNotificationInputSchema = z.object({
  user_id: z.number(),
  borrowing_id: z.number(),
  message: z.string(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationInputSchema>;

export const markNotificationReadInputSchema = z.object({
  id: z.number(),
});

export type MarkNotificationReadInput = z.infer<typeof markNotificationReadInputSchema>;

// Report schemas
export const documentReportSchema = z.object({
  document_type: documentTypeSchema,
  total_borrowed: z.number(),
  total_returned: z.number(),
  currently_borrowed: z.number(),
});

export type DocumentReport = z.infer<typeof documentReportSchema>;

export const userBorrowingReportSchema = z.object({
  user_id: z.number(),
  user_name: z.string(),
  total_borrowings: z.number(),
  overdue_borrowings: z.number(),
});

export type UserBorrowingReport = z.infer<typeof userBorrowingReportSchema>;

export const overdueReportSchema = z.object({
  user_id: z.number(),
  user_name: z.string(),
  borrowing_id: z.number(),
  document_type: documentTypeSchema,
  document_id: z.number(),
  borrowed_at: z.coerce.date(),
  days_overdue: z.number(),
});

export type OverdueReport = z.infer<typeof overdueReportSchema>;

// Dashboard schemas
export const dashboardStatsSchema = z.object({
  total_documents: z.number(),
  total_users: z.number(),
  total_borrowings: z.number(),
  active_borrowings: z.number(),
  overdue_borrowings: z.number(),
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;