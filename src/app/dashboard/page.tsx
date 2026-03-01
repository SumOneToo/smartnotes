import { auth } from "@clerk/nextjs/server";

export default function DashboardPage() {
  const { userId } = auth();

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-sm text-gray-600">Authenticated user: <code>{userId}</code></p>
      <p className="text-sm text-gray-600">Use <code>/api/notes</code> for authenticated note CRUD.</p>
    </main>
  );
}
