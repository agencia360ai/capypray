// RevenueCat → entitlements mirror (GDD §10.3). Deploy: supabase functions deploy rc-webhook --no-verify-jwt
// Set RC_WEBHOOK_SECRET in the function secrets and the same value as the Authorization header in the RC dashboard.
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  if (req.headers.get("authorization") !== Deno.env.get("RC_WEBHOOK_SECRET")) return new Response("unauthorized", { status: 401 });

  const { event } = await req.json();
  // app_user_id is our own anonymous id = parent uuid (no device identifiers, GDD §11)
  const parentId: string | undefined = event?.app_user_id;
  if (!parentId) return new Response("no app_user_id", { status: 400 });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const active = ["INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "PRODUCT_CHANGE", "NON_RENEWING_PURCHASE"].includes(event.type)
    || (event.type === "CANCELLATION" && event.expiration_at_ms > Date.now());
  const expires = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;

  const { error } = await supabase.from("entitlements").upsert({
    parent_id: parentId,
    product_id: event.product_id ?? "premium",
    is_active: active && !["EXPIRATION", "BILLING_ISSUE"].includes(event.type),
    expires_at: expires,
    source: "revenuecat",
    updated_at: new Date().toISOString(),
  });
  if (error) return new Response(error.message, { status: 500 });
  return new Response("ok");
});
