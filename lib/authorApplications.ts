import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAccessProfile } from "@/lib/access";

export type AuthorApplicationStatus =
  | "pending"
  | "approved"
  | "rejected";

export type AuthorApplication = {
  id: string;
  user_id: string;
  pen_name: string;
  motivation: string;
  experience: string | null;
  status: AuthorApplicationStatus;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

function client() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase no está configurado.");
  return supabase;
}

export async function getMyAuthorApplications(): Promise<AuthorApplication[]> {
  const supabase = client();
  const profile = await getAccessProfile();

  if (!profile) return [];

  const { data, error } = await supabase
    .from("author_applications")
    .select("*")
    .eq("user_id", profile.user_id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as AuthorApplication[];
}

export async function submitAuthorApplication(input: {
  pen_name: string;
  motivation: string;
  experience?: string;
}) {
  const supabase = client();

  const { data, error } = await supabase.rpc(
    "submit_author_application",
    {
      p_pen_name: input.pen_name.trim(),
      p_motivation: input.motivation.trim(),
      p_experience: input.experience?.trim() || null,
    }
  );

  if (error) throw new Error(error.message);

  return (Array.isArray(data) ? data[0] : data) as AuthorApplication;
}

export async function getPendingAuthorApplications(): Promise<
  Array<AuthorApplication & { display_name: string }>
> {
  const supabase = client();

  const { data, error } = await supabase
    .from("author_applications")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const applications = (data || []) as AuthorApplication[];
  const userIds = [...new Set(applications.map((item) => item.user_id))];

  if (userIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", userIds);

  if (profilesError) throw new Error(profilesError.message);

  const names = new Map(
    (profiles || []).map((profile) => [
      String(profile.user_id),
      String(profile.display_name || "Usuario"),
    ])
  );

  return applications.map((application) => ({
    ...application,
    display_name: names.get(application.user_id) || "Usuario",
  }));
}

export async function reviewAuthorApplication(
  applicationId: string,
  decision: "approved" | "rejected",
  notes: string
) {
  const supabase = client();

  const { data, error } = await supabase.rpc(
    "review_author_application",
    {
      p_application_id: applicationId,
      p_decision: decision,
      p_admin_notes: notes.trim() || null,
    }
  );

  if (error) throw new Error(error.message);

  return (Array.isArray(data) ? data[0] : data) as AuthorApplication;
}
