import { PostHog } from "posthog-node";

let posthogClient: PostHog | null = null;

export function getPosthogClient(): PostHog | null {
  const key = process.env.POSTHOG_API_KEY;

  if (!key) {
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(key, {
      host: process.env.POSTHOG_HOST ?? "https://app.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return posthogClient;
}

export async function captureServerEvent(params: {
  distinctId: string;
  event: "note_created" | "note_deleted" | "search_performed";
  properties?: Record<string, unknown>;
}) {
  const posthog = getPosthogClient();

  if (!posthog) {
    return;
  }

  posthog.capture({
    distinctId: params.distinctId,
    event: params.event,
    properties: params.properties,
  });

  await posthog.shutdown();
  posthogClient = null;
}
