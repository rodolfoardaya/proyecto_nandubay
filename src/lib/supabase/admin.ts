import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente con service role — SOLO se importa desde Server Actions / route
// handlers. Nunca debe llegar a un componente cliente ni exponerse al
// navegador: permite saltear RLS (crear usuarios de auth, backups
// generales del Admin, etc).
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
