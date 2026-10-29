import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { safeNext } from "@/lib/safeNext";

export const metadata: Metadata = { title: "Buat akun | Arah Assist" };

export default async function DaftarPage({ searchParams }: PageProps<"/daftar">) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return (
    <AuthLayout
      mode="daftar"
      next={next}
      title="Buat akun Arah Assist"
      description="Satu akun, satu Workspace pribadi untuk To-Do List dan pengingatmu."
    >
      <AuthForm mode="daftar" next={next} />
    </AuthLayout>
  );
}
