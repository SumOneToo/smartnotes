import * as Sentry from "@sentry/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getNoteTagsMap, getOrCreateUserProfile } from "@/lib/notes";
import { searchNoteVectors } from "@/lib/pinecone";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { trackEvent } from "@/lib/telemetry";

const searchSchema = z.object({
  query: z.string().trim().min(1).max(500),
  topK: z.number().int().min(1).max(50).optional(),
});

export async function POST(request: Request) {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = searchSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const profile = await getOrCreateUserProfile({
      clerkUserId: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? null,
    });

    const matches = await searchNoteVectors({
      userId: profile.id,
      query: parsed.data.query,
      topK: parsed.data.topK,
    });

    if (matches.length === 0) {
      await trackEvent({
        clerkUserId: user.id,
        event: "search_performed",
        properties: { queryLength: parsed.data.query.length, resultCount: 0 },
      });

      return NextResponse.json({ notes: [] });
    }

    const ids = matches.map((m) => m.noteId);
    const scoreById = new Map(matches.map((match) => [match.noteId, match.score]));

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("notes")
      .select("id, title, content, pinned, created_at, updated_at")
      .eq("user_id", profile.id)
      .in("id", ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const tagsByNoteId = await getNoteTagsMap(ids);

    const notes = (data ?? [])
      .map((note) => ({
        ...note,
        score: scoreById.get(note.id) ?? 0,
        tags: tagsByNoteId.get(note.id) ?? [],
      }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    await trackEvent({
      clerkUserId: user.id,
      event: "search_performed",
      properties: { queryLength: parsed.data.query.length, resultCount: notes.length },
    });

    return NextResponse.json({ notes });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Failed to search notes" }, { status: 500 });
  }
}
