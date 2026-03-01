import * as Sentry from "@sentry/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getOrCreateUserProfile, replaceNoteTags } from "@/lib/notes";
import { deleteNoteVector, upsertNoteVector } from "@/lib/pinecone";
import { ensurePremiumOr403 } from "@/lib/premium";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { trackEvent } from "@/lib/telemetry";

const updateNoteSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.string().trim().min(1).max(10000).optional(),
  pinned: z.boolean().optional(),
  tags: z.array(z.string().trim().min(1).max(32)).max(20).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = updateNoteSchema.safeParse(await request.json());

  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.success ? undefined : parsed.error.flatten() }, { status: 400 });
  }

  try {
    const profile = await getOrCreateUserProfile({
      clerkUserId: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? null,
    });

    if ((parsed.data.pinned !== undefined || parsed.data.tags !== undefined) && profile.plan === "free") {
      const premiumError = ensurePremiumOr403(profile.plan);
      if (premiumError) {
        return premiumError;
      }
    }

    const payload: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) payload.title = parsed.data.title;
    if (parsed.data.content !== undefined) payload.content = parsed.data.content;
    if (parsed.data.pinned !== undefined) payload.pinned = parsed.data.pinned;

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("notes")
      .update(payload)
      .eq("id", params.id)
      .eq("user_id", profile.id)
      .select("id, title, content, pinned, created_at, updated_at")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Note not found" }, { status: 404 });
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let tags: string[] | undefined;

    if (parsed.data.tags !== undefined) {
      tags = Array.from(new Set(parsed.data.tags.map((tag) => tag.trim().toLowerCase()))).filter(Boolean);
      await replaceNoteTags({
        noteId: data.id,
        userId: profile.id,
        tags,
      });
    }

    await upsertNoteVector({
      noteId: data.id,
      userId: profile.id,
      title: data.title,
      content: data.content,
    });

    return NextResponse.json({ note: { ...data, ...(tags ? { tags } : {}) } });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
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
    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", params.id)
      .eq("user_id", profile.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await deleteNoteVector({ noteId: params.id, userId: profile.id });
    await trackEvent({ clerkUserId: user.id, event: "note_deleted", properties: { noteId: params.id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
