import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getOrCreateUserProfile } from "@/lib/notes";
import { createSupabaseAdminClient } from "@/lib/supabase";

const updateNoteSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.string().trim().min(1).max(10000).optional(),
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

  const profile = await getOrCreateUserProfile({
    clerkUserId: user.id,
    email: user.emailAddresses[0]?.emailAddress ?? null,
  });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("notes")
    .update(parsed.data)
    .eq("id", params.id)
    .eq("user_id", profile.id)
    .select("id, title, content, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ note: data });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  return new NextResponse(null, { status: 204 });
}
