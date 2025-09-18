import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['admin', 'user', 'kepala_seksi']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  full_name: z.string(),
  role: userRoleSchema,
  seksi: z.string().nullable(), // For kepala_seksi to manage specific seksi
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Input schemas for user management
export const createUserInputSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
  role: userRoleSchema,
  seksi: z.string().nullable().optional()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  full_name: z.string().min(1).optional(),
  role: userRoleSchema.optional(),
  seksi: z.string().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Document type enum
export const documentTypeSchema = z.enum(['buku_tanah', 'surat_ukur', 'warkah']);
export type DocumentType = z.infer<typeof documentTypeSchema>;

// Buku Tanah schema
export const bukuTanahSchema = z.object({
  id: z.number(),
  nomor_hak: z.string(),
  nama_pemilik: z.string(),
  desa: z.string(),
  kecamatan: z.string(),
  is_available: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type BukuTanah = z.infer<typeof bukuTanahSchema>;

export const createBukuTanahInputSchema = z.object({
  nomor_hak: z.string().min(1),
  nama_pemilik: z.string().min(1),
  desa: z.string().min(1),
  kecamatan: z.string().min(1)
});

export type CreateBukuTanahInput = z.infer<typeof createBukuTanahInputSchema>;

export const updateBukuTanahInputSchema = z.object({
  id: z.number(),
  nomor_hak: z.string().min(1).optional(),
  nama_pemilik: z.string().min(1).optional(),
  desa: z.string().min(1).optional(),
  kecamatan: z.string().min(1).optional(),
  is_available: z.boolean().optional()
});

export type UpdateBukuTanahInput = z.infer<typeof updateBukuTanahInputSchema>;

// Surat Ukur schema
export const suratUkurSchema = z.object({
  id: z.number(),
  nomor_su: z.string(),
  tahun: z.number().int(),
  luas: z.number(),
  desa: z.string(),
  is_available: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type SuratUkur = z.infer<typeof suratUkurSchema>;

export const createSuratUkurInputSchema = z.object({
  nomor_su: z.string().min(1),
  tahun: z.number().int().min(1900).max(2100),
  luas: z.number().positive(),
  desa: z.string().min(1)
});

export type CreateSuratUkurInput = z.infer<typeof createSuratUkurInputSchema>;

export const updateSuratUkurInputSchema = z.object({
  id: z.number(),
  nomor_su: z.string().min(1).optional(),
  tahun: z.number().int().min(1900).max(2100).optional(),
  luas: z.number().positive().optional(),
  desa: z.string().min(1).optional(),
  is_available: z.boolean().optional()
});

export type UpdateSuratUkurInput = z.infer<typeof updateSuratUkurInputSchema>;

// Warkah schema
export const warkahSchema = z.object({
  id: z.number(),
  nomor_hak: z.string(),
  desa: z.string(),
  kecamatan: z.string(),
  di_208: z.string(),
  is_available: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Warkah = z.infer<typeof warkahSchema>;

export const createWarkahInputSchema = z.object({
  nomor_hak: z.string().min(1),
  desa: z.string().min(1),
  kecamatan: z.string().min(1),
  di_208: z.string().min(1)
});

export type CreateWarkahInput = z.infer<typeof createWarkahInputSchema>;

export const updateWarkahInputSchema = z.object({
  id: z.number(),
  nomor_hak: z.string().min(1).optional(),
  desa: z.string().min(1).optional(),
  kecamatan: z.string().min(1).optional(),
  di_208: z.string().min(1).optional(),
  is_available: z.boolean().optional()
});

export type UpdateWarkahInput = z.infer<typeof updateWarkahInputSchema>;

// Loan status enum
export const loanStatusSchema = z.enum(['active', 'returned']);
export type LoanStatus = z.infer<typeof loanStatusSchema>;

// Loan schema
export const loanSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  document_type: documentTypeSchema,
  document_id: z.number(),
  loan_date: z.coerce.date(),
  expected_return_date: z.coerce.date().nullable(),
  actual_return_date: z.coerce.date().nullable(),
  status: loanStatusSchema,
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Loan = z.infer<typeof loanSchema>;

export const createLoanInputSchema = z.object({
  document_type: documentTypeSchema,
  document_id: z.number(),
  expected_return_date: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional()
});

export type CreateLoanInput = z.infer<typeof createLoanInputSchema>;

export const returnDocumentInputSchema = z.object({
  loan_id: z.number(),
  return_notes: z.string().nullable().optional()
});

export type ReturnDocumentInput = z.infer<typeof returnDocumentInputSchema>;

// Notification schema
export const notificationSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  loan_id: z.number(),
  title: z.string(),
  message: z.string(),
  is_read: z.boolean(),
  created_at: z.coerce.date()
});

export type Notification = z.infer<typeof notificationSchema>;

export const markNotificationReadInputSchema = z.object({
  notification_id: z.number()
});

export type MarkNotificationReadInput = z.infer<typeof markNotificationReadInputSchema>;

// Report schemas
export const reportPeriodSchema = z.enum(['daily', 'weekly', 'monthly']);
export type ReportPeriod = z.infer<typeof reportPeriodSchema>;

export const reportInputSchema = z.object({
  period: reportPeriodSchema,
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  seksi: z.string().optional() // For kepala_seksi filtering
});

export type ReportInput = z.infer<typeof reportInputSchema>;

export const loanReportSchema = z.object({
  total_loans_by_type: z.record(z.string(), z.number()),
  total_returns: z.number(),
  overdue_loans: z.array(z.object({
    loan_id: z.number(),
    user_name: z.string(),
    document_type: z.string(),
    loan_date: z.coerce.date(),
    days_overdue: z.number()
  })),
  loans_per_user: z.record(z.string(), z.number())
});

export type LoanReport = z.infer<typeof loanReportSchema>;

// Authentication schemas
export const loginInputSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const authResponseSchema = z.object({
  user: userSchema,
  token: z.string()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// Dashboard schemas
export const dashboardStatsSchema = z.object({
  total_documents: z.object({
    buku_tanah: z.number(),
    surat_ukur: z.number(),
    warkah: z.number()
  }),
  active_loans: z.number(),
  overdue_loans: z.number(),
  recent_loans: z.array(loanSchema),
  notifications_count: z.number()
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;