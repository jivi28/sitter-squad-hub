// atomic-signup edge function
// ─────────────────────────────────────────────────────────────────────────────
// This function now handles ONLY the OAuth path (is_oauth: true).
// Email/password signup is handled on the client via supabase.auth.signUp(),
// with role assignment done atomically by the handle_new_user DB trigger.
//
// OAuth path security:
//   - Caller must present a valid Bearer JWT matching oauth_user_id.
//   - Role is written server-side; DB partial unique index prevents conflicts.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const body = await req.json();
    const { intended_role, is_oauth, oauth_user_id } = body;

    // ── VALIDATE ROLE ─────────────────────────────────────────────────────────
    if (!intended_role || (intended_role !== 'parent' && intended_role !== 'sitter')) {
      return json({ error: 'intended_role must be "parent" or "sitter"' }, 400);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PATH A: OAuth — assign role to an existing auth user
    // Secured via bearer token: caller must present a valid JWT for oauth_user_id.
    // Note: AuthCallback now calls assign_role_once() RPC directly, which is
    // preferred. This path is kept for backward compatibility only.
    // ══════════════════════════════════════════════════════════════════════════
    if (is_oauth && oauth_user_id) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return json({ error: 'Unauthorized' }, 401);
      }
      const callerClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace('Bearer ', '');
      const { data: claims, error: claimsErr } = await callerClient.auth.getClaims(token);
      if (claimsErr || !claims?.claims || claims.claims.sub !== oauth_user_id) {
        return json({ error: 'Unauthorized: token mismatch' }, 401);
      }

      // Delegate to assign_role_once via the caller's session
      const { data: assignResult, error: rpcErr } = await callerClient
        .rpc('assign_role_once' as any, { _intended_role: intended_role });

      if (rpcErr) throw new Error(rpcErr.message);

      const result = assignResult as { success?: boolean; error?: string; code?: string } | null;
      if (result?.code === 'CONFLICTING_ROLE') {
        return json({ error: result.error, code: 'CONFLICTING_ROLE' }, 409);
      }
      if (!result?.success) {
        return json({ error: result?.error || 'Role assignment failed' }, 500);
      }

      console.log(`OAuth role assigned: user=${oauth_user_id} role=${intended_role}`);
      return json({ success: true, user_id: oauth_user_id, role: intended_role }, 200);
    }

    // Email/password path removed — handled by supabase.auth.signUp() + handle_new_user trigger.
    return json({ error: 'Use supabase.auth.signUp() for email/password registration.' }, 400);

  } catch (error: any) {
    console.error('atomic-signup error:', error);
    return json({ error: error.message || 'Request failed' }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
