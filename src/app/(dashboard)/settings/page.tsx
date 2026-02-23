import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { PlatformSettings } from "@/components/settings/platform-settings";
import { UserProfileSettings } from "@/components/settings/user-profile-settings";
import { SettingsSectionNav } from "@/components/settings/settings-section-nav";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("Error fetching profile:", profileError);
    redirect("/dashboard");
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <SettingsSectionNav />

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-10">
          <UserProfileSettings user={user} profile={profile} />

          <Separator />

          <PlatformSettings profile={profile} />
        </div>
      </div>
    </div>
  );
}
