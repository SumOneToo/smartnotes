import * as Sentry from "@sentry/nextjs";

import { captureServerEvent } from "@/lib/posthog";

export async function trackEvent(params: {
  clerkUserId: string;
  event: "note_created" | "note_deleted" | "search_performed";
  properties?: Record<string, unknown>;
}) {
  try {
    await captureServerEvent({
      distinctId: params.clerkUserId,
      event: params.event,
      properties: params.properties,
    });
  } catch (error) {
    Sentry.captureException(error);
  }
}
