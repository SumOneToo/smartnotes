import { createSupabaseAdminClient } from "@/lib/supabase";

export const FREE_PLAN_NOTE_LIMIT = 50;

type UserProfile = {
  id: string;
  plan: "free" | "pro";
};

export async function getOrCreateUserProfile(params: {
  clerkUserId: string;
  email: string | null;
}): Promise<UserProfile> {
  const supabase = createSupabaseAdminClient();

  const { data: existing, error: fetchError } = await supabase
    .from("users")
    .select("id, plan")
    .eq("clerk_user_id", params.clerkUserId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (existing) {
    return existing as UserProfile;
  }

  const { data: created, error: createError } = await supabase
    .from("users")
    .insert({
      clerk_user_id: params.clerkUserId,
      email: params.email,
      plan: "free",
    })
    .select("id, plan")
    .single();

  if (createError) {
    throw createError;
  }

  return created as UserProfile;
}

export async function countUserNotes(userId: string): Promise<number> {
  const supabase = createSupabaseAdminClient();

  const { count, error } = await supabase
    .from("notes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return count ?? 0;
}
