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

  let createdUserId: string | null = null;

  try {
    const body = await req.json();
    const { email, password, intended_role, is_oauth, oauth_user_id } = body;

    // ── VALIDATE ROLE ─────────────────────────────────────────────────────────
    if (!intended_role || (intended_role !== 'parent' && intended_role !== 'sitter')) {
      return json({ error: 'intended_role must be "parent" or "sitter"' }, 400);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PATH A: OAuth user already exists in auth.users — just assign role + profile
    // ══════════════════════════════════════════════════════════════════════════
    if (is_oauth && oauth_user_id) {
      // Verify the caller is who they claim to be
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

      // Check for conflicting role
      const { data: conflict } = await supabaseAdmin.rpc('has_conflicting_role', {
        _user_id: oauth_user_id,
        _intended_role: intended_role,
      });
      if (conflict) {
        const other = intended_role === 'sitter' ? 'parent' : 'sitter';
        return json({
          error: `This email is already registered as a ${other}.`,
          code: 'CONFLICTING_ROLE',
        }, 409);
      }

      // Check if role already exists (idempotent)
      const { data: existingRole } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', oauth_user_id)
        .eq('role', intended_role)
        .maybeSingle();

      if (!existingRole) {
        const { error: roleErr } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: oauth_user_id, role: intended_role });
        if (roleErr) throw new Error(`Role assignment failed: ${roleErr.message}`);
      }

      // Ensure profile row exists (handle_new_user trigger may have already created it)
      await supabaseAdmin
        .from('profiles')
        .upsert({ user_id: oauth_user_id }, { onConflict: 'user_id', ignoreDuplicates: true });

      console.log(`OAuth role assigned: user=${oauth_user_id} role=${intended_role}`);
      return json({ success: true, user_id: oauth_user_id, role: intended_role }, 200);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PATH B: Email/password — new user creation (atomic)
    // ══════════════════════════════════════════════════════════════════════════
    if (!email || !password) {
      return json({ error: 'email and password are required for non-OAuth signup' }, 400);
    }
    if (password.length < 6) {
      return json({ error: 'Password must be at least 6 characters' }, 400);
    }

    // Pre-check: does auth user already exist with this email?
    const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listErr) throw new Error(`Failed to check existing users: ${listErr.message}`);

    const existingAuthUser = listData?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingAuthUser) {
      const { data: conflict } = await supabaseAdmin.rpc('has_conflicting_role', {
        _user_id: existingAuthUser.id,
        _intended_role: intended_role,
      });
      if (conflict) {
        const other = intended_role === 'sitter' ? 'parent' : 'sitter';
        return json({
          error: `This email is already registered as a ${other}. Please log in with the correct role.`,
          code: 'CONFLICTING_ROLE',
        }, 409);
      }
      return json({
        error: 'An account with this email already exists. Please log in instead.',
        code: 'EMAIL_EXISTS',
      }, 409);
    }

    // Step 1: Create auth user
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://sitter-squad-hub.lovable.app';
    const emailRedirectTo = `${frontendUrl}/verify-email?type=${intended_role}&email=${encodeURIComponent(email)}`;

    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      options: { emailRedirectTo },
    });
    if (authErr || !authData?.user) throw new Error(authErr?.message || 'Failed to create auth user');

    createdUserId = authData.user.id;
    console.log(`Created auth user: ${createdUserId} for role: ${intended_role}`);

    // Step 2: Ensure profile row (handle_new_user trigger may already have run)
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert({ user_id: createdUserId }, { onConflict: 'user_id', ignoreDuplicates: true });
    if (profileErr) {
      await rollback(supabaseAdmin, createdUserId);
      throw new Error(`Profile creation failed: ${profileErr.message}`);
    }

    // Step 3: Create user_roles with EXACTLY the intended_role — server-side, never from localStorage
    const { error: roleErr } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: createdUserId, role: intended_role });
    if (roleErr) {
      await rollback(supabaseAdmin, createdUserId);
      throw new Error(`Role assignment failed: ${roleErr.message}`);
    }

    // Step 4: Generate confirmation link (triggers Supabase to send confirmation email)
    await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: { redirectTo: emailRedirectTo },
    });

    console.log(`Atomic signup complete: user=${createdUserId} role=${intended_role}`);
    return json({
      success: true,
      user_id: createdUserId,
      role: intended_role,
      message: 'Account created. Please check your email to verify your account.',
    }, 201);

  } catch (error: any) {
    console.error('Atomic signup error:', error);

    if (createdUserId) {
      await rollback(supabaseAdmin, createdUserId);
    }

    return json({ error: error.message || 'Signup failed' }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

async function rollback(admin: ReturnType<typeof createClient>, userId: string) {
  console.log(`Rolling back user: ${userId}`);
  try {
    await admin.from('user_roles').delete().eq('user_id', userId);
    await admin.from('profiles').delete().eq('user_id', userId);
    await admin.from('sitters').delete().eq('user_id', userId);
    await admin.auth.admin.deleteUser(userId);
    console.log(`Rollback complete for user: ${userId}`);
  } catch (e) {
    console.error(`Rollback failed for user ${userId}:`, e);
  }
}
