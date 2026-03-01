import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">SmartNotes</h1>
      <p className="text-base text-gray-600">
        Clerk authentication and Supabase-backed notes APIs are wired for PDCA-032 milestones 032.2–032.4.
      </p>

      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-medium">Authentication</h2>
        <div className="mt-3 flex items-center gap-3">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded bg-black px-3 py-2 text-sm text-white">Sign in (Email / Google)</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="rounded border border-gray-300 px-3 py-2 text-sm">Sign up</button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
            <a href="/dashboard" className="rounded bg-black px-3 py-2 text-sm text-white">
              Open dashboard
            </a>
          </SignedIn>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-medium">Notes API</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-gray-700">
          <li><code>GET /api/notes</code> — list current user notes</li>
          <li><code>POST /api/notes</code> — create note (free plan limit: 50)</li>
          <li><code>PATCH /api/notes/:id</code> — update own note</li>
          <li><code>DELETE /api/notes/:id</code> — delete own note</li>
        </ul>
      </section>
    </main>
  );
}
