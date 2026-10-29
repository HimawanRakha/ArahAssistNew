import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listTodos } from "@/lib/api";
import { listShelf } from "@/lib/files";
import { WorkspaceApp } from "@/components/workspace/WorkspaceApp";

export const metadata: Metadata = { title: "Workspace | Arah Assist" };

export default async function WorkspacePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk");

  const [todos, files] = await Promise.all([listTodos(user), listShelf(user)]);

  return (
    <WorkspaceApp
      user={{ name: user.name, email: user.email, workspaceName: user.workspaceName }}
      initialTodos={todos}
      initialFiles={files}
    />
  );
}
