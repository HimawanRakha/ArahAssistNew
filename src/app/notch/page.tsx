import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { listTodos } from "@/lib/api";
import { listShelf } from "@/lib/files";
import { NotchApp } from "@/components/notch/NotchApp";

export const metadata: Metadata = { title: "Notch | Arah Assist" };

// Dimuat oleh aplikasi Notch desktop (desktop/main.cjs) di jendela transparan yang selalu di atas.
export default async function NotchPage() {
  const user = await getCurrentUser();
  const [todos, files] = user ? await Promise.all([listTodos(user), listShelf(user)]) : [[], []];

  return (
    <>
      <style>{"html,body{background:transparent!important;overflow:hidden}"}</style>
      <NotchApp user={user ? { name: user.name } : null} initialTodos={todos} initialFiles={files} />
    </>
  );
}
