import { createClient } from "@/lib/supabase/server";
import { UpdateProfileSchema } from "@/lib/validations";
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
    const validationResult = UpdateProfileSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { fullName, email } = validationResult.data;

    // Check if email is being updated
    const isEmailChanged = email !== user.email;

    if (isEmailChanged) {
      // Update email via Supabase auth (sends confirmation email)
      const { error: emailError } = await supabase.auth.updateUser({
        email: email,
      });

      if (emailError) {
        return NextResponse.json(
          { error: "Failed to update email", details: emailError.message },
          { status: 500 }
        );
      }
    }

    // Update profile in database
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        email: email,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileError) {
      return NextResponse.json(
        { error: "Failed to update profile", details: profileError.message },
        { status: 500 }
      );
    }

    // Revalidate settings page
    revalidatePath("/settings");

    return NextResponse.json({
      success: true,
      message: isEmailChanged
        ? "Profile updated. Please check your email to confirm the new address."
        : "Profile updated successfully",
      emailConfirmationRequired: isEmailChanged,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
