import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 px-6">
      <h1 className="text-4xl font-bold text-zinc-900">Nomi</h1>
      <p className="max-w-md text-center text-zinc-600">
        Store your name as it actually is, assemble the right version for each
        context, and control exactly who sees which one.
      </p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Log in
        </Link>
        <Link
          href="/register"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Register
        </Link>
        <Link
          href="/resolve"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Requester playground
        </Link>
      </div>
    </main>
  );
}
