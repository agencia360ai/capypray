// Weekly Parent Report (GDD §9). Cron: Sunday 18:00 parent-local, scheduled via pg_cron → http call.
// v1.1 scope: computes the report payload; delivery (push/email) is wired in v1.1.
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const { data: kids, error } = await supabase.from("kid_profiles").select("id, nickname, parent_id");
  if (error) return new Response(error.message, { status: 500 });

  const reports = [];
  for (const kid of kids ?? []) {
    const [{ count: sessions }, { data: people }, { data: progress }] = await Promise.all([
      supabase.from("progress").select("*", { count: "exact", head: true }).eq("kid_id", kid.id).gte("completed_at", since),
      supabase.from("prayer_people").select("label, prayed_count").eq("kid_id", kid.id).order("prayed_count", { ascending: false }).limit(3),
      supabase.from("progress").select("lesson_id").eq("kid_id", kid.id).gte("completed_at", since),
    ]);
    reports.push({
      parent_id: kid.parent_id,
      kid: kid.nickname,
      sessions: sessions ?? 0,
      lessons: (progress ?? []).map((p) => p.lesson_id),
      top_people: people ?? [],
      suggestion: (people?.[0]) ? `Ask ${kid.nickname}: "What did you pray for ${people[0].label} this week?"` : `Ask ${kid.nickname} who they would like to pray for.`,
    });
  }
  return Response.json({ generated_at: new Date().toISOString(), reports }, { headers: { "content-type": "application/json" } });
});
