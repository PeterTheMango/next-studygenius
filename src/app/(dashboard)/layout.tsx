import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { ThemeInitializer } from "@/components/theme-initializer";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

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
  }

  if (user && profile) {
    // Augment user object with profile data
    user.user_metadata.profile = profile;
    console.log(user);
  }

  // Build theme preferences from profile
  const themePreferences = {
    appearanceMode: (profile?.appearance_mode || "system") as
      | "light"
      | "dark"
      | "system",
    themeColor: profile?.theme_color || "blue",
    themeCustomPrimary: profile?.theme_custom_primary || null,
    themeCustomSecondary: profile?.theme_custom_secondary || null,
    themeCustomAccent: profile?.theme_custom_accent || null,
    fontFamily: profile?.font_family || "inter",
    fontSize: profile?.font_size || "medium",
  };

  return (
    <div className="h-screen bg-background flex">
      <ThemeInitializer preferences={themePreferences} />
      <div className="hidden md:block w-64 bg-card border-r border-border shrink-0 z-10">
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
