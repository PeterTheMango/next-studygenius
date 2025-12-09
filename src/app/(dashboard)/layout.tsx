import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile data
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error fetching user profile:", profileError);
    // Decide how to handle this error:
    // - Redirect to login (if profile is essential)
    // - Proceed without profile (if profile is optional)
    // For now, I'll proceed without profile, just not augment the user object.
  }

  if (user && profile) {
    // Augment user object with profile data
    user.user_metadata.profile = profile;
  }

  return (
    <div className="h-screen bg-slate-50 flex">
      <div className="hidden md:block w-64 bg-white border-r border-slate-200 shrink-0 z-10">
        <Sidebar className="h-full" user={user} />
      </div>
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Navbar user={user} />
        <main className="flex-1 overflow-auto p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
