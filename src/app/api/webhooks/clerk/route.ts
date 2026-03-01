import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { Webhook } from "svix";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: Request) {
  const payload = await request.text();
  const headers = request.headers;

  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing Svix headers" }, { status: 400 });
  }

  const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!signingSecret) {
    return NextResponse.json({ error: "Missing webhook signing secret" }, { status: 500 });
  }

  try {
    const webhook = new Webhook(signingSecret);
    const event = webhook.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as {
      type: string;
      data: {
        email_addresses?: Array<{ email_address?: string }>;
        first_name?: string;
      };
    };

    if (event.type !== "user.created") {
      return NextResponse.json({ ok: true });
    }

    if (!resend) {
      return NextResponse.json({ ok: true, skipped: "RESEND_API_KEY not configured" });
    }

    const email = event.data.email_addresses?.[0]?.email_address;
    if (!email) {
      return NextResponse.json({ ok: true, skipped: "No email on user.created" });
    }

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "onboarding@example.com",
      to: [email],
      subject: "Welcome to SmartNotes",
      html: `<p>Hi ${event.data.first_name ?? "there"}, welcome to SmartNotes 👋</p><p>Your workspace is ready.</p>`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 400 });
  }
}
