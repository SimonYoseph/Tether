import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

function findText(value: unknown, keys: string[], depth = 0): string | undefined {
  if (!value || typeof value !== "object" || depth > 2) return undefined;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    if (typeof record[key] === "string" && record[key].trim()) return record[key].trim();
  }
  for (const child of Object.values(record)) {
    const result = findText(child, keys, depth + 1);
    if (result) return result;
  }
  return undefined;
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function tagsFromSms(text: string) {
  return Array.from(text.matchAll(/(^|\s)(#{1,2})([\p{L}\p{N}_-]+)/gu), (match) =>
    `${match[2] === "##" ? "sub" : "main"}:${match[3]}`,
  );
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ownerId = process.env.TETHER_SMS_OWNER_ID;
  const secret = process.env.TETHER_SMS_WEBHOOK_SECRET;

  if (!supabaseUrl || !serviceRoleKey || !ownerId || !secret) {
    return NextResponse.json({ error: "SMS integration is not configured." }, { status: 503 });
  }

  const authorization = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const suppliedSecret = request.headers.get("x-tether-sms-secret") ?? authorization ?? request.nextUrl.searchParams.get("secret");
  if (suppliedSecret !== secret) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let payload: unknown;
  try {
    payload = request.headers.get("content-type")?.includes("application/json")
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());
  } catch {
    return NextResponse.json({ error: "Invalid SMS payload." }, { status: 400 });
  }

  const body = findText(payload, ["body", "message", "text", "content"]);
  const sender = findText(payload, ["from", "sender", "phone", "phoneNumber", "originator"]);
  const allowedSender = process.env.TETHER_SMS_ALLOWED_SENDER;
  if (!body) return NextResponse.json({ error: "SMS body is required." }, { status: 400 });
  if (allowedSender && (!sender || normalizePhone(sender) !== normalizePhone(allowedSender))) {
    return NextResponse.json({ error: "Sender is not allowed." }, { status: 403 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { error } = await supabase.from("tethers").insert({
    user_id: ownerId,
    title: body.split("\n")[0].slice(0, 80) || "SMS note",
    description: body,
    tags: ["source:sms", ...tagsFromSms(body)],
    is_public: false,
  });
  if (error) return NextResponse.json({ error: "Unable to save SMS note." }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 201 });
}
