import { NextResponse } from "next/server";

export function ensurePremiumOr403(plan: "free" | "pro") {
  if (plan !== "pro") {
    return NextResponse.json({ error: "Premium feature requires pro plan" }, { status: 403 });
  }

  return null;
}
