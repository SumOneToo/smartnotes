export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">SmartNotes</h1>
      <p className="text-muted-foreground text-base text-gray-600">
        PDCA-032 bootstrap is complete. This scaffold is ready for incremental
        integrations in upcoming milestones.
      </p>

      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-medium">Planned feature modules</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-gray-700">
          <li><code>src/features/notes</code> – note list + persistence adapters</li>
          <li><code>src/features/editor</code> – rich editing workflows</li>
          <li><code>src/integrations</code> – external service connectors</li>
          <li><code>src/lib</code> – shared utilities and domain helpers</li>
        </ul>
      </section>
    </main>
  );
}
