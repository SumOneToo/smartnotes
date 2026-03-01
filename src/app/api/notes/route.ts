import * as Sentry from "@sentry/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  countUserNotes,
  FREE_PLAN_NOTE_LIMIT,
  getNoteTagsMap,
  getOrCreateUserProfile,
  replaceNoteTags,
} from "@/lib/notes";
import { upsertNoteVector } from "@/lib/pinecone";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { trackEvent } from "@/lib/telemetry";

const createNoteSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(10000),
  pinned: z.boolean().optional(),
  tags: z.array(z.string().trim().min(1).max(32)).max(20).optional(),
});

export async function GET() {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = await getOrCreateUserProfile({
      clerkUserId: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? null,
    });

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("notes")
      .select("id, title, content, pinned, created_at, updated_at")
      .eq("user_id", profile.id)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const noteIds = (data ?? []).map((note) => note.id);
    const tagsByNoteId = await getNoteTagsMap(noteIds);

    const notes = (data ?? []).map((note) => ({
      ...note,
      tags: tagsByNoteId.get(note.id) ?? [],
    }));

    return NextResponse.json({ notes });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Failed to load notes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createNoteSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const profile = await getOrCreateUserProfile({
      clerkUserId: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? null,
    });

    if (profile.plan === "free") {
      const existingCount = await countUserNotes(profile.id);

      if (existingCount >= FREE_PLAN_NOTE_LIMIT) {
        return NextResponse.json(
          {
            error: `Free plan note limit reached (${FREE_PLAN_NOTE_LIMIT})`,
          },
          { status: 403 },
        );
      }

      if (parsed.data.pinned || (parsed.data.tags?.length ?? 0) > 0) {
        return NextResponse.json({ error: "Premium feature requires pro plan" }, { status: 403 });
      }
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: profile.id,
        title: parsed.data.title,
        content: parsed.data.content,
        pinned: parsed.data.pinned ?? false,
      })
      .select("id, title, content, pinned, created_at, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const tags = Array.from(new Set((parsed.data.tags ?? []).map((tag) => tag.trim().toLowerCase()))).filter(Boolean);
    await replaceNoteTags({ noteId: data.id, userId: profile.id, tags });

    await upsertNoteVector({
      noteId: data.id,
      userId: profile.id,
      title: data.title,
      content: data.content,
    });

    await trackEvent({
      clerkUserId: user.id,
      event: "note_created",
      properties: { noteId: data.id },
    });

    return NextResponse.json({ note: { ...data, tags } }, { status: 201 });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
