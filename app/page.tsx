// app/page.tsx  (SERVER COMPONENT)
import { redirect } from "next/navigation";
import HomeShell from "@/components/home-shell";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function Page() {
  try {
    const supabase = createServerSupabase();
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      redirect("/login?next=/");
    }
  } catch {
    // Kalau fetch Supabase time-out/ gagal, arahkan ke login daripada crash
    redirect("/login?next=/");
  }

  return <HomeShell />;
}
