"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AccountButton() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Link
      href="/cuenta"
      className="max-w-40 truncate rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
      title={email || "Cuenta"}
    >
      {email ? email.split("@")[0] : "Cuenta"}
    </Link>
  );
}
