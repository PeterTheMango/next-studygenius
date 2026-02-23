import { createClient } from "@/lib/supabase/server";
import { UpdatePreferencesSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = UpdatePreferencesSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const {
      appearanceMode,
      themeColor,
      themeCustomPrimary,
      themeCustomSecondary,
      themeCustomAccent,
      fontFamily,
      fontSize,
    } = validationResult.data;

    // Update preferences in database
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        appearance_mode: appearanceMode,
        theme_color: themeColor,
        theme_custom_primary: themeCustomPrimary,
        theme_custom_secondary: themeCustomSecondary,
        theme_custom_accent: themeCustomAccent,
        font_family: fontFamily,
        font_size: fontSize,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update preferences", details: updateError.message },
        { status: 500 }
      );
    }

    // Revalidate settings page
    revalidatePath("/settings");

    return NextResponse.json({
      success: true,
      message: "Preferences updated successfully",
    });
  } catch (error) {
    console.error("Error updating preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
