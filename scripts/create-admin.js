import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const email = 'direction@mzntransport.fr';
const password = 'UnMotDePasseFort123!';
const name = 'Salomé';

async function findAuthUserByEmail(targetEmail) {
  let page = 1;
  const perPage = 1000;
  for (let i = 0; i < 10; i++) { // up to 10k users
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users || [];
    const found = users.find(u => (u.email || '').toLowerCase() === targetEmail.toLowerCase());
    if (found) return found;
    if (users.length < perPage) break; // no more pages
    page++;
  }
  return null;
}

async function upsertPublicUser(id, emailAddr, displayName) {
  return await supabaseAdmin
    .from('users')
    .upsert({ id, name: displayName, email: emailAddr, role: 'ADMIN' }, { onConflict: 'id' });
}

async function main() {
  try {
    console.log('➡️ Creating admin auth user:', email);
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    let userId;
    if (authError) {
      const msg = String(authError.message || '').toLowerCase();
      if (authError.code === 'email_exists' || msg.includes('already been registered') || msg.includes('email exists')) {
        console.warn('⚠️ User already exists in auth; looking up id by email...');
        const existing = await findAuthUserByEmail(email);
        if (!existing) {
          console.error('❌ Email exists but user not found via admin list. Please verify in Supabase dashboard.');
          process.exit(1);
        }
        userId = existing.id;
      } else {
        console.error('❌ Error creating auth user:', authError);
        process.exit(1);
      }
    } else {
      userId = authUser?.user?.id;
    }

    if (!userId) {
      console.error('❌ No user id available.');
      process.exit(1);
    }

    console.log('➡️ Upserting profile into public.users with role ADMIN');
    const { error: upsertError } = await upsertPublicUser(userId, email, name);
    if (upsertError) {
      console.error('❌ Error upserting into public.users:', upsertError);
      process.exit(1);
    }

    console.log('✅ Admin ensured in auth and public.users:', { id: userId, email, name, role: 'ADMIN' });
    process.exit(0);
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

main();
