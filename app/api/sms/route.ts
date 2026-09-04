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

const namedColors: Record<string, string> = { blue: "#48aff5", red: "#ff6f61", orange: "#ff927b", yellow: "#f5c85b", green: "#73d39a", purple: "#b698ff", pink: "#f582b1" };

function parseSms(text: string) {
  const lines = text.split("\n");
  const titleLine = lines.find((line) => /^title:\s*/i.test(line));
  const title = titleLine?.replace(/^title:\s*/i, "").trim();
  const tags = Array.from(text.matchAll(/(^|\s)(#{1,2})([\p{L}\p{N}_-]+)(?:\s+\/([#\w]+))?/gu), (match) => {
    const rawColor = match[4]?.toLowerCase();
    const color = rawColor?.startsWith("#") && /^#[0-9a-f]{6}$/i.test(rawColor) ? rawColor : rawColor ? namedColors[rawColor] : undefined;
    return { tag: `${match[2] === "##" ? "sub" : "main"}:${match[3]}`, color };
  });
  return { title, tags, body: lines.filter((line) => line !== titleLine).join("\n").trim() };
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secret = process.env.TETHER_SMS_WEBHOOK_SECRET;

  if (!supabaseUrl || !serviceRoleKey || !secret) {
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
  if (!body) return NextResponse.json({ error: "SMS body is required." }, { status: 400 });
  if (!sender) return NextResponse.json({ error: "SMS sender is required." }, { status: 400 });

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: settings, error: settingsError } = await supabase
    .from("tether_sms_settings")
    .select("user_id")
    .eq("phone_number", normalizePhone(sender))
    .maybeSingle();
  if (settingsError || !settings) return NextResponse.json({ error: "Sender is not configured." }, { status: 403 });
  const parsed = parseSms(body);
  const coloredTags = parsed.tags.filter((item): item is { tag: string; color: string } => Boolean(item.color));
  if (coloredTags.length) {
    const { error: tagError } = await supabase.from("tether_tag_settings").upsert(coloredTags.map((item) => ({ user_id: settings.user_id, tag: item.tag, color: item.color })));
    if (tagError) return NextResponse.json({ error: "Unable to save SMS tag color." }, { status: 500 });
  }
  const { error } = await supabase.from("tethers").insert({
    user_id: settings.user_id,
    title: parsed.title || parsed.body.split("\n")[0].slice(0, 80) || "SMS note",
    description: parsed.body || body,
    tags: ["source:sms", ...parsed.tags.map((item) => item.tag)],
    outline_color: coloredTags[0]?.color,
    is_public: false,
  });
  if (error) return NextResponse.json({ error: "Unable to save SMS note." }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 201 });
}
