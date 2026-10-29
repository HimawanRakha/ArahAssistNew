"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

type Mode = "masuk" | "daftar";

export function AuthForm({ mode, next = "/workspace" }: { mode: Mode; next?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRegister = mode === "daftar";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(isRegister ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Terjadi kesalahan. Coba lagi.");
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate={false}>
      {isRegister && (
        <Field label="Nama" name="name" autoComplete="name" minLength={2} placeholder="Nama panggilanmu" />
      )}
      <Field label="Email" name="email" type="email" autoComplete="email" placeholder="nama@kampus.ac.id" />
      <Field
        label="Kata sandi"
        name="password"
        type="password"
        autoComplete={isRegister ? "new-password" : "current-password"}
        minLength={isRegister ? 8 : undefined}
        hint={isRegister ? "Minimal 8 karakter." : undefined}
      />

      {error && (
        <p role="alert" className="rounded-xl bg-bahaya/10 px-3.5 py-2.5 text-sm font-medium text-bahaya">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-arus text-[15px] font-semibold text-white transition-colors hover:bg-arus-deep disabled:opacity-60"
      >
        {pending && <Loader2 size={18} className="animate-spin" />}
        {isRegister ? "Buat akun" : "Masuk"}
      </button>

      <p className="pt-1 text-center text-sm text-redup">
        {isRegister ? "Sudah punya akun? " : "Belum punya akun? "}
        <Link
          href={`${isRegister ? "/masuk" : "/daftar"}${next !== "/workspace" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold text-arus-deep underline underline-offset-4"
        >
          {isRegister ? "Masuk" : "Buat akun"}
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  hint,
  ...input
}: { label: string; name: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        name={name}
        required
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="block h-12 w-full rounded-xl border border-kabut-deep bg-white px-4 text-[15px] placeholder:text-redup/60 focus:border-arus focus:outline-none focus:ring-2 focus:ring-arus/25"
        {...input}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-redup">
          {hint}
        </p>
      )}
    </div>
  );
}
