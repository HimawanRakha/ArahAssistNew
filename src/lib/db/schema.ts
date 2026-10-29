import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceName: text("workspace_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TodoStatus = "pending" | "acc" | "completed";

export const todoItems = pgTable("todo_items", {
  id: uuid("id").primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  scheduledTime: timestamp("scheduled_time", { withTimezone: true }),
  status: text("status").$type<TodoStatus>().notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// File transit di Notch. Isi file disimpan sebagai base64 agar portabel di Neon/Vercel,
// dan dibersihkan otomatis setelah expires_at lewat.
export const notchTempFiles = pgTable("notch_temp_files", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  todoItemId: uuid("todo_item_id").references(() => todoItems.id, {
    onDelete: "set null",
  }),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  fileData: text("file_data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export type ReminderState = "waiting" | "acc" | "snoozed";

export const taskReminders = pgTable("task_reminders", {
  id: uuid("id").primaryKey(),
  todoItemId: uuid("todo_item_id")
    .notNull()
    .unique()
    .references(() => todoItems.id, { onDelete: "cascade" }),
  isEnabled: boolean("is_enabled").notNull().default(false),
  remindAt: timestamp("remind_at", { withTimezone: true }),
  snoozeMinutes: integer("snooze_minutes"),
  reminderState: text("reminder_state").$type<ReminderState>().notNull().default("waiting"),
  /** remind_at yang sudah dikirimi notifikasi HP; berbeda dari remind_at (mis. setelah Snooze) berarti kirim lagi */
  pushedFor: timestamp("pushed_for", { withTimezone: true }),
});

// Perangkat (browser/HP) yang menerima notifikasi pengingat lewat web push
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
