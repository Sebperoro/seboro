import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type UserRole = "reader" | "author" | "admin";

export type AccessProfile = {
  user_id: string;
  display_name: string;
  role: UserRole;
};

function withTimeout<T>(promise: Promise<T>, ms = 6000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error("La comprobación de permisos tardó demasiado.")),
        ms
      )
    ),
  ]);
}

export async function getAccessProfile(): Promise<AccessProfile | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase no está configurado.");

  const {
    data: { session },
    error: sessionError,
  } = await withTimeout(supabase.auth.getSession());

  if (sessionError) throw new Error(sessionError.message);
  if (!session?.user) return null;

  const { data, error } = await withTimeout(
    supabase
      .from("profiles")
      .select("user_id, display_name, role")
      .eq("user_id", session.user.id)
      .maybeSingle()
  );

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    user_id: String(data.user_id),
    display_name: String(data.display_name || "Usuario"),
    role: data.role as UserRole,
  };
}
