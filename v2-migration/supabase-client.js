import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm';

export const SUPABASE_URL = 'https://zyrbbkbwrijnnykbgjvc.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_OW-03s1ExuA2GwmmL7HtRQ_IHOPxyGL';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export async function signUpWithEmail({ email, password, username }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanUsername = String(username || '').trim();
  const cleanPassword = String(password || '');

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error('Geçerli bir e-posta gir.');
  if (!/^[A-Za-z0-9._-]{3,32}$/.test(cleanUsername)) throw new Error('Kullanıcı adı 3-32 karakter olmalı; harf, rakam, nokta, tire ve alt çizgi kullanılabilir.');
  if (cleanPassword.length < 8) throw new Error('Şifre en az 8 karakter olmalı.');

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password: cleanPassword,
    options: { data: { username: cleanUsername } }
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail({ email, password }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: String(password || '')
  });
  if (error) throw error;
  return data;
}

export async function ensureOwnProfile(user) {
  if (!user?.id) throw new Error('Oturum bulunamadı.');

  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('id', user.id)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing;

  const username = String(user.user_metadata?.username || '').trim();
  if (!/^[A-Za-z0-9._-]{3,32}$/.test(username)) {
    throw new Error('Bu hesap için geçerli kullanıcı adı bulunamadı.');
  }

  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({ id: user.id, username })
    .select('id, username')
    .single();
  if (insertError) {
    if (insertError.code === '23505') throw new Error('Bu kullanıcı adı başka bir hesap tarafından kullanılıyor.');
    throw insertError;
  }
  return created;
}

export async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user || null;
}
