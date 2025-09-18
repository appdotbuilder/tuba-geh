import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import all schemas
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
  createBorrowingInputSchema,
  returnBorrowingInputSchema,
  createNotificationInputSchema,
  markNotificationReadInputSchema,
} from './schema';

// Import all handlers
import { login, getCurrentUser } from './handlers/auth';
import { createUser, updateUser, getUsers, getUserById, deleteUser } from './handlers/users';
import { createBukuTanah, updateBukuTanah, getBukuTanahList, getBukuTanahById, deleteBukuTanah } from './handlers/buku_tanah';
import { createSuratUkur, updateSuratUkur, getSuratUkurList, getSuratUkurById, deleteSuratUkur } from './handlers/surat_ukur';
import { createWarkah, updateWarkah, getWarkahList, getWarkahById, deleteWarkah } from './handlers/warkah';
import { createBorrowing, returnBorrowing, getBorrowings, getBorrowingsByUserId, getActiveBorrowings, getOverdueBorrowings, getBorrowingById } from './handlers/borrowings';
import { createNotification, getNotificationsByUserId, getUnreadNotificationsByUserId, markNotificationAsRead, markAllNotificationsAsRead, generateOverdueNotifications } from './handlers/notifications';
import { getDocumentReport, getUserBorrowingReport, getOverdueReport, getDashboardStats, getUserDashboardStats, getKepalaSeccionDashboardStats } from './handlers/reports';

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
    getCurrentUser: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(({ input }) => getCurrentUser(input.userId)),
  }),

  // User management routes
  users: router({
    create: publicProcedure
      .input(createUserInputSchema)
      .mutation(({ input }) => createUser(input)),
    update: publicProcedure
      .input(updateUserInputSchema)
      .mutation(({ input }) => updateUser(input)),
    list: publicProcedure
      .query(() => getUsers()),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getUserById(input.id)),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteUser(input.id)),
  }),

  // Buku Tanah routes
  bukuTanah: router({
    create: publicProcedure
      .input(createBukuTanahInputSchema)
      .mutation(({ input }) => createBukuTanah(input)),
    update: publicProcedure
      .input(updateBukuTanahInputSchema)
      .mutation(({ input }) => updateBukuTanah(input)),
    list: publicProcedure
      .query(() => getBukuTanahList()),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getBukuTanahById(input.id)),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteBukuTanah(input.id)),
  }),

  // Surat Ukur routes
  suratUkur: router({
    create: publicProcedure
      .input(createSuratUkurInputSchema)
      .mutation(({ input }) => createSuratUkur(input)),
    update: publicProcedure
      .input(updateSuratUkurInputSchema)
      .mutation(({ input }) => updateSuratUkur(input)),
    list: publicProcedure
      .query(() => getSuratUkurList()),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getSuratUkurById(input.id)),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteSuratUkur(input.id)),
  }),

  // Warkah routes
  warkah: router({
    create: publicProcedure
      .input(createWarkahInputSchema)
      .mutation(({ input }) => createWarkah(input)),
    update: publicProcedure
      .input(updateWarkahInputSchema)
      .mutation(({ input }) => updateWarkah(input)),
    list: publicProcedure
      .query(() => getWarkahList()),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getWarkahById(input.id)),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteWarkah(input.id)),
  }),

  // Borrowing routes
  borrowings: router({
    create: publicProcedure
      .input(createBorrowingInputSchema)
      .mutation(({ input }) => createBorrowing(input)),
    return: publicProcedure
      .input(returnBorrowingInputSchema)
      .mutation(({ input }) => returnBorrowing(input)),
    list: publicProcedure
      .query(() => getBorrowings()),
    getByUserId: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(({ input }) => getBorrowingsByUserId(input.userId)),
    getActive: publicProcedure
      .query(() => getActiveBorrowings()),
    getOverdue: publicProcedure
      .query(() => getOverdueBorrowings()),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getBorrowingById(input.id)),
  }),

  // Notification routes
  notifications: router({
    create: publicProcedure
      .input(createNotificationInputSchema)
      .mutation(({ input }) => createNotification(input)),
    getByUserId: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(({ input }) => getNotificationsByUserId(input.userId)),
    getUnreadByUserId: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(({ input }) => getUnreadNotificationsByUserId(input.userId)),
    markAsRead: publicProcedure
      .input(markNotificationReadInputSchema)
      .mutation(({ input }) => markNotificationAsRead(input)),
    markAllAsRead: publicProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(({ input }) => markAllNotificationsAsRead(input.userId)),
    generateOverdue: publicProcedure
      .mutation(() => generateOverdueNotifications()),
  }),

  // Report routes
  reports: router({
    documents: publicProcedure
      .query(() => getDocumentReport()),
    userBorrowings: publicProcedure
      .query(() => getUserBorrowingReport()),
    overdue: publicProcedure
      .query(() => getOverdueReport()),
    dashboardStats: publicProcedure
      .query(() => getDashboardStats()),
    userDashboardStats: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(({ input }) => getUserDashboardStats(input.userId)),
    kepalaSeccionDashboardStats: publicProcedure
      .input(z.object({ sectionUsers: z.array(z.number()) }))
      .query(({ input }) => getKepalaSeccionDashboardStats(input.sectionUsers)),
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
  console.log(`TRPC server listening at port: ${port}`);
}

start();