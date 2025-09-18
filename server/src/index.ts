import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  loginInputSchema,
  createUserInputSchema,
  updateUserInputSchema,
  createBukuTanahInputSchema,
  updateBukuTanahInputSchema,
  createSuratUkurInputSchema,
  updateSuratUkurInputSchema,
  createWarkahInputSchema,
  updateWarkahInputSchema,
  createLoanInputSchema,
  returnDocumentInputSchema,
  markNotificationReadInputSchema,
  reportInputSchema
} from './schema';

// Import handlers
import { login, verifyToken, getCurrentUser } from './handlers/auth';
import { createUser, getUsers, getUserById, updateUser, deleteUser } from './handlers/users';
import { createBukuTanah, getBukuTanahList, getBukuTanahById, updateBukuTanah, deleteBukuTanah, searchBukuTanah } from './handlers/buku_tanah';
import { createSuratUkur, getSuratUkurList, getSuratUkurById, updateSuratUkur, deleteSuratUkur, searchSuratUkur } from './handlers/surat_ukur';
import { createWarkah, getWarkahList, getWarkahById, updateWarkah, deleteWarkah, searchWarkah } from './handlers/warkah';
import { createLoan, returnDocument, getUserLoans, getActiveLoans, getLoanById, getOverdueLoans, getLoanHistory, extendLoan } from './handlers/loans';
import { createOverdueNotification, getUserNotifications, getUnreadNotificationsCount, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, generateOverdueNotifications } from './handlers/notifications';
import { generateLoanReport, getDailyReport, getWeeklyReport, getMonthlyReport, getUserLoanSummary, getDocumentUtilization } from './handlers/reports';
import { getDashboardStats, getAdminDashboard, getUserDashboard, getKepalaSeksiDashboard, getRecentActivity, getSystemHealth } from './handlers/dashboard';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  auth: router({
    login: publicProcedure
      .input(loginInputSchema)
      .mutation(({ input }) => login(input)),
    
    verifyToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(({ input }) => verifyToken(input.token)),
    
    getCurrentUser: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(({ input }) => getCurrentUser(input.userId)),
  }),

  // User management routes (Admin only)
  users: router({
    create: publicProcedure
      .input(createUserInputSchema)
      .mutation(({ input }) => createUser(input)),
    
    getAll: publicProcedure
      .query(() => getUsers()),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getUserById(input.id)),
    
    update: publicProcedure
      .input(updateUserInputSchema)
      .mutation(({ input }) => updateUser(input)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteUser(input.id)),
  }),

  // Buku Tanah document management
  bukuTanah: router({
    create: publicProcedure
      .input(createBukuTanahInputSchema)
      .mutation(({ input }) => createBukuTanah(input)),
    
    getAll: publicProcedure
      .query(() => getBukuTanahList()),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getBukuTanahById(input.id)),
    
    update: publicProcedure
      .input(updateBukuTanahInputSchema)
      .mutation(({ input }) => updateBukuTanah(input)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteBukuTanah(input.id)),
    
    search: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(({ input }) => searchBukuTanah(input.query)),
  }),

  // Surat Ukur document management
  suratUkur: router({
    create: publicProcedure
      .input(createSuratUkurInputSchema)
      .mutation(({ input }) => createSuratUkur(input)),
    
    getAll: publicProcedure
      .query(() => getSuratUkurList()),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getSuratUkurById(input.id)),
    
    update: publicProcedure
      .input(updateSuratUkurInputSchema)
      .mutation(({ input }) => updateSuratUkur(input)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteSuratUkur(input.id)),
    
    search: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(({ input }) => searchSuratUkur(input.query)),
  }),

  // Warkah document management
  warkah: router({
    create: publicProcedure
      .input(createWarkahInputSchema)
      .mutation(({ input }) => createWarkah(input)),
    
    getAll: publicProcedure
      .query(() => getWarkahList()),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getWarkahById(input.id)),
    
    update: publicProcedure
      .input(updateWarkahInputSchema)
      .mutation(({ input }) => updateWarkah(input)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteWarkah(input.id)),
    
    search: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(({ input }) => searchWarkah(input.query)),
  }),

  // Loan management
  loans: router({
    create: publicProcedure
      .input(createLoanInputSchema.extend({ userId: z.number() }))
      .mutation(({ input }) => {
        const { userId, ...loanInput } = input;
        return createLoan(loanInput, userId);
      }),
    
    return: publicProcedure
      .input(returnDocumentInputSchema)
      .mutation(({ input }) => returnDocument(input)),
    
    getUserLoans: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(({ input }) => getUserLoans(input.userId)),
    
    getActive: publicProcedure
      .query(() => getActiveLoans()),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getLoanById(input.id)),
    
    getOverdue: publicProcedure
      .input(z.object({ days: z.number().optional() }))
      .query(({ input }) => getOverdueLoans(input.days)),
    
    getHistory: publicProcedure
      .input(z.object({ userId: z.number().optional() }))
      .query(({ input }) => getLoanHistory(input.userId)),
    
    extend: publicProcedure
      .input(z.object({ 
        loanId: z.number(),
        newExpectedDate: z.coerce.date()
      }))
      .mutation(({ input }) => extendLoan(input.loanId, input.newExpectedDate)),
  }),

  // Notification management
  notifications: router({
    getUserNotifications: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(({ input }) => getUserNotifications(input.userId)),
    
    getUnreadCount: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(({ input }) => getUnreadNotificationsCount(input.userId)),
    
    markAsRead: publicProcedure
      .input(markNotificationReadInputSchema)
      .mutation(({ input }) => markNotificationAsRead(input)),
    
    markAllAsRead: publicProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(({ input }) => markAllNotificationsAsRead(input.userId)),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteNotification(input.id)),
    
    generateOverdue: publicProcedure
      .mutation(() => generateOverdueNotifications()),
  }),

  // Reporting
  reports: router({
    generate: publicProcedure
      .input(reportInputSchema)
      .query(({ input }) => generateLoanReport(input)),
    
    daily: publicProcedure
      .input(z.object({ 
        date: z.coerce.date(),
        seksi: z.string().optional()
      }))
      .query(({ input }) => getDailyReport(input.date, input.seksi)),
    
    weekly: publicProcedure
      .input(z.object({ 
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        seksi: z.string().optional()
      }))
      .query(({ input }) => getWeeklyReport(input.startDate, input.endDate, input.seksi)),
    
    monthly: publicProcedure
      .input(z.object({ 
        year: z.number(),
        month: z.number(),
        seksi: z.string().optional()
      }))
      .query(({ input }) => getMonthlyReport(input.year, input.month, input.seksi)),
    
    userSummary: publicProcedure
      .input(z.object({ 
        userId: z.number(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date()
      }))
      .query(({ input }) => getUserLoanSummary(input.userId, input.startDate, input.endDate)),
    
    utilization: publicProcedure
      .input(z.object({ 
        startDate: z.coerce.date(),
        endDate: z.coerce.date()
      }))
      .query(({ input }) => getDocumentUtilization(input.startDate, input.endDate)),
  }),

  // Dashboard
  dashboard: router({
    stats: publicProcedure
      .input(z.object({ 
        userId: z.number(),
        userRole: z.string(),
        seksi: z.string().optional()
      }))
      .query(({ input }) => getDashboardStats(input.userId, input.userRole, input.seksi)),
    
    admin: publicProcedure
      .query(() => getAdminDashboard()),
    
    user: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(({ input }) => getUserDashboard(input.userId)),
    
    kepalaSeksi: publicProcedure
      .input(z.object({ seksi: z.string() }))
      .query(({ input }) => getKepalaSeksiDashboard(input.seksi)),
    
    recentActivity: publicProcedure
      .input(z.object({ 
        limit: z.number().optional(),
        userId: z.number().optional()
      }))
      .query(({ input }) => getRecentActivity(input.limit, input.userId)),
    
    systemHealth: publicProcedure
      .query(() => getSystemHealth()),
  }),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Tuba GEH TRPC server listening at port: ${port}`);
}

start();