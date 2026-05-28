import { adminClient, corsHeaders, jsonResponse } from '../_shared/billing.ts';

type InviteRequest = {
  restaurantId?: string;
  email?: string;
  role?: string;
};

type MemberRow = { role: string; active: boolean; restaurant?: { name?: string | null } | null };
type InvitationRow = { id: string; restaurant_id: string; email: string; role: string; status: string; created_at: string; expires_at?: string | null };

const allowedRoles = new Set(['manager', 'kitchen', 'cashier', 'waiter']);

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function siteUrl(req: Request): string {
  const configured = Deno.env.get('PUBLIC_SITE_URL') ?? Deno.env.get('SITE_URL');
  if (configured) return configured.replace(/\/$/, '');
  const origin = req.headers.get('origin');
  return (origin || 'https://flux-menu.vercel.app').replace(/\/$/, '');
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function sanitizeLog(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => {
    if (/token|authorization|secret|key/i.test(key)) return [key, '[redacted]'];
    return [key, value];
  }));
}

function clientMessageForAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('already') || normalized.includes('registered') || normalized.includes('exist')) {
    return 'Convite criado. Este email já tem conta; peça para a pessoa entrar e abrir o link de convite.';
  }
  return 'Convite criado, mas o email não pôde ser enviado automaticamente.';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405);

  let input: InviteRequest | null = null;

  try {
    input = await req.json() as InviteRequest;
    const restaurantId = String(input.restaurantId ?? '').trim();
    const email = normalizeEmail(String(input.email ?? ''));
    const role = String(input.role ?? '').trim();

    if (!restaurantId) return jsonResponse({ error: 'Restaurante obrigatório.' }, 400);
    if (!/^\S+@\S+\.\S+$/.test(email)) return jsonResponse({ error: 'Email inválido.' }, 400);
    if (!allowedRoles.has(role)) return jsonResponse({ error: 'Permissão inválida para convite.' }, 400);

    const authorization = req.headers.get('authorization') ?? '';
    const accessToken = authorization.replace(/^Bearer\s+/i, '').trim();
    if (!accessToken) return jsonResponse({ error: 'Login obrigatório.' }, 401);

    const supabase = adminClient();
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData.user) return jsonResponse({ error: 'Sessão inválida.' }, 401);

    const { data: member, error: memberError } = await supabase
      .from('restaurant_members')
      .select('role,active,restaurant:restaurants(name)')
      .eq('restaurant_id', restaurantId)
      .eq('profile_id', authData.user.id)
      .maybeSingle();

    if (memberError) throw memberError;
    if (normalizeEmail(authData.user.email ?? '') === email) {
      return jsonResponse({ error: 'Use outro email. Você não pode convidar a própria conta.' }, 400);
    }
    const typedMember = member as MemberRow | null;
    if (!typedMember?.active || !['owner', 'manager'].includes(typedMember.role)) {
      return jsonResponse({ error: 'Seu perfil não pode convidar funcionários.' }, 403);
    }
    if (typedMember.role === 'manager' && role === 'manager') {
      return jsonResponse({ error: 'Gerente não pode convidar outro gerente.' }, 403);
    }

    const token = crypto.randomUUID() + '-' + crypto.randomUUID();
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: existingInvitation, error: existingInvitationError } = await supabase
      .from('staff_invitations')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvitationError) throw existingInvitationError;

    const invitationPayload = {
      restaurant_id: restaurantId,
      email,
      role,
      status: 'pending',
      token_hash: tokenHash,
      expires_at: expiresAt,
      invited_by_profile_id: authData.user.id,
      revoked_at: null,
      accepted_at: null,
      updated_at: new Date().toISOString()
    };

    const invitationQuery = existingInvitation?.id
      ? supabase
        .from('staff_invitations')
        .update(invitationPayload)
        .eq('id', existingInvitation.id)
      : supabase
        .from('staff_invitations')
        .insert(invitationPayload);

    const { data: invitation, error: invitationError } = await invitationQuery
      .select('id,restaurant_id,email,role,status,created_at,expires_at')
      .single();

    if (invitationError || !invitation) throw invitationError ?? new Error('Convite não salvo.');

    const redirectTo = siteUrl(req) + '/accept-invite?token=' + encodeURIComponent(token);
    const typedInvitation = invitation as InvitationRow;
    const restaurantName = typedMember.restaurant?.name ?? 'restaurante';
    let emailSent = true;
    let message = 'Convite criado. Se o email não chegar, envie o link manual abaixo.';

    const { error: inviteEmailError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        staff_invitation_id: typedInvitation.id,
        restaurant_id: restaurantId,
        restaurant_name: restaurantName,
        role
      }
    });

    if (inviteEmailError) {
      emailSent = false;
      message = clientMessageForAuthError(inviteEmailError.message);
      console.warn('[staff-invite] email not sent', sanitizeLog({ restaurantId, email, role, message: inviteEmailError.message }));
    }

    console.info('[staff-invite] invitation created', sanitizeLog({ restaurantId, email, role, emailSent }));

    return jsonResponse({
      invitation: {
        id: typedInvitation.id,
        restaurantId: typedInvitation.restaurant_id,
        email: typedInvitation.email,
        role: typedInvitation.role,
        status: typedInvitation.status,
        createdAt: typedInvitation.created_at,
        expiresAt: typedInvitation.expires_at
      },
      emailSent,
      message,
      manualLink: redirectTo
    });
  } catch (error) {
    console.error('[staff-invite] failed', sanitizeLog({
      restaurantId: input?.restaurantId ?? null,
      role: input?.role ?? null,
      message: error instanceof Error ? error.message : 'unknown error'
    }));
    return jsonResponse({ error: 'Não foi possível enviar o convite. Tente novamente.' }, 500);
  }
});
