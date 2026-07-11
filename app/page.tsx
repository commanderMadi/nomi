export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <h1 className="text-4xl font-bold">Welcome to Next.js</h1>
        <p className="text-center sm:text-left text-lg text-gray-600">
          Get started by editing{" "}
          <code className="bg-gray-100 px-2 py-1 rounded font-mono text-sm">
            app/page.tsx
          </code>
        </p>
      </main>
    </div>
  );
}
