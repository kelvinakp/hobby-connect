import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Supabase pauses a free-tier project after roughly 7 days without queries, which
// takes the live demo offline. The scheduled workflow in
// .github/workflows/keep-alive.yml pings this route so the database keeps seeing
// traffic.
//
// createClient() reads cookies(), so this route is always rendered dynamically and
// the query genuinely runs on every request instead of being frozen at build time.

export async function GET() {
  try {
    const supabase = await createClient();

    // Any real table works here — the point is to reach the database, not to read
    // anything. A row-level security denial comes back as an empty result rather
    // than an error, so this stays green whether or not the anon role sees rows.
    const { error } = await supabase.from("hobbies").select("*").limit(1);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
