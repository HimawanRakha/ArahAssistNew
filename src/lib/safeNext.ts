/** Hanya izinkan tujuan internal setelah login, agar ?next= tidak bisa dipakai mengarahkan ke situs lain. */
export function safeNext(value: string | string[] | undefined) {
  const next = Array.isArray(value) ? value[0] : value;
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/workspace";
}
