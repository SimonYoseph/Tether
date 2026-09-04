import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

export async function POST() {
  const textbeeApiKey = process.env.TEXTBEE_API_KEY;
  if (!textbeeApiKey) {
    return NextResponse.json({ error: "Text messaging is not configured yet." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data: settings } = await supabase
    .from("tether_sms_settings")
    .select("phone_number")
    .eq("user_id", user.id)
    .maybeSingle();
  const recipient = formatPhone(settings?.phone_number ?? "");
  if (!recipient) return NextResponse.json({ error: "Save a phone number first." }, { status: 400 });

  const message = "Welcome to Tether. Text this number to save a note. Use Title: your title. Add #tag for a main tag or ##tag for a sub tag. Add /blue or /#48aff5 after a tag to color the tag and note.";
  const response = await fetch("https://api.textbee.dev/api/v1/gateway/send-sms", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": textbeeApiKey },
    body: JSON.stringify({ message, recipients: [recipient] }),
  });
  if (!response.ok) return NextResponse.json({ error: "Tether could not send the welcome text." }, { status: 502 });

  return NextResponse.json({ ok: true });
}