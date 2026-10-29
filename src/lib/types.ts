export type TodoStatus = "pending" | "acc" | "completed";
export type ReminderState = "waiting" | "acc" | "snoozed";

export type AttachedFile = {
  id: string;
  fileName: string;
  mimeType: string;
  filePath: string;
};

export type ReminderDTO = {
  isEnabled: boolean;
  remindAt: string | null;
  snoozeMinutes: number | null;
  state: ReminderState;
};

export type TodoDTO = {
  id: string;
  title: string;
  scheduledTime: string | null;
  status: TodoStatus;
  createdAt: string;
  files: AttachedFile[];
  reminder: ReminderDTO | null;
};

export type ShelfFileDTO = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  todoItemId: string | null;
  createdAt: string;
  expiresAt: string;
};

export const STATUS_LABEL: Record<TodoStatus, string> = {
  pending: "Menunggu",
  acc: "Sedang dikerjakan (ACC)",
  completed: "Selesai",
};
