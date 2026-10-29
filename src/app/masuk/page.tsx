import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { safeNext } from "@/lib/safeNext";

export const metadata: Metadata = { title: "Masuk | Arah Assist" };

export default async function MasukPage({ searchParams }: PageProps<"/masuk">) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return (
    <AuthLayout mode="masuk" next={next} title="Masuk ke Workspace" description="Lanjutkan rute harimu. Tugasmu tersimpan permanen di sini.">
      <AuthForm mode="masuk" next={next} />
    </AuthLayout>
  );
}
