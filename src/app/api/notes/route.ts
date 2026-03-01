import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { countUserNotes, FREE_PLAN_NOTE_LIMIT, getOrCreateUserProfile } from "@/lib/notes";
import { createSupabaseAdminClient } from "@/lib/supabase";

const createNoteSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(10000),
});

export async function GET() {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getOrCreateUserProfile({
    clerkUserId: user.id,
    email: user.emailAddresses[0]?.emailAddress ?? null,
  });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("notes")
    .select("id, title, content, created_at, updated_at")
    .eq("user_id", profile.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notes: data });
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
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: profile.id,
      title: parsed.data.title,
      content: parsed.data.content,
    })
    .select("id, title, content, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ note: data }, { status: 201 });
}
