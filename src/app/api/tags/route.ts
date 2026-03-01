import * as Sentry from "@sentry/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getOrCreateUserProfile } from "@/lib/notes";
import { ensurePremiumOr403 } from "@/lib/premium";
import { createSupabaseAdminClient } from "@/lib/supabase";

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

    const premiumError = ensurePremiumOr403(profile.plan);
    if (premiumError) {
      return premiumError;
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("note_tags")
      .select("tag")
      .eq("user_id", profile.id)
      .order("tag", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const tags = Array.from(new Set((data ?? []).map((row) => row.tag)));
    return NextResponse.json({ tags });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Failed to load tags" }, { status: 500 });
  }
}
