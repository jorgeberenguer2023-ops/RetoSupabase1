import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey);
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Sesión no válida' }), { status: 401 });

    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return new Response(JSON.stringify({ error: 'Solo un administrador puede crear accesos.' }), { status: 403 });

    const { communityId, email, fullName } = await req.json();
    if (!communityId || !email) return new Response(JSON.stringify({ error: 'communityId y email son obligatorios.' }), { status: 400 });

    const normalizedEmail = String(email).trim().toLowerCase();
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existingUser = existing.users.find((u) => u.email?.toLowerCase() === normalizedEmail);
    let targetUserId = existingUser?.id;

    if (!targetUserId) {
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
        data: { full_name: fullName ?? '' },
      });
      if (inviteError) throw inviteError;
      targetUserId = invited.user.id;
    }

    const { error: profileError } = await admin.from('profiles').upsert({
      id: targetUserId,
      full_name: fullName ?? normalizedEmail.split('@')[0],
      role: 'user',
      community_id: Number(communityId),
    });
    if (profileError) throw profileError;

    const { error: communityError } = await admin.from('comunidad').update({ user_id: targetUserId }).eq('id', Number(communityId));
    if (communityError) throw communityError;

    return new Response(JSON.stringify({ ok: true, invited: !existingUser, userId: targetUserId }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Error creando el acceso.' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
