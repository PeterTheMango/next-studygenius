"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Camera, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface UserProfileSettingsProps {
  user: any;
  profile: any;
}

export function UserProfileSettings({ user, profile }: UserProfileSettingsProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Form state
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [email, setEmail] = useState(profile.email || user.email || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "");

  const processAvatarFile = async (file: File) => {
    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    // Validate file type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("File must be a JPEG, PNG, or WebP image");
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/users/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload avatar");
      }

      setAvatarUrl(data.avatarUrl);
      toast.success(data.message);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processAvatarFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processAvatarFile(file);
    }
  };

  const handleAvatarRemove = async () => {
    setIsUploadingAvatar(true);

    try {
      const response = await fetch("/api/users/avatar", {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove avatar");
      }

      setAvatarUrl("");
      toast.success(data.message);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      toast.success(data.message);

      if (data.emailConfirmationRequired) {
        toast.info("Check your inbox to confirm your new email address", {
          duration: 5000,
        });
      }

      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section
      id="profile"
      className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500"
    >
      {/* Profile Picture */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Profile Picture</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a profile picture to personalize your account
          </p>
        </div>
        <div
          className={cn(
            "flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl border-2 border-dashed transition-colors",
            isDragOver ? "border-primary bg-primary/5" : "border-border"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Avatar with hover overlay */}
          <div className="relative group shrink-0">
            <Avatar className="h-24 w-24 ring-4 ring-border">
              <AvatarImage src={avatarUrl} alt={fullName} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {fullName ? fullName.slice(0, 2).toUpperCase() : "U"}
              </AvatarFallback>
            </Avatar>
            {/* Hover overlay */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            >
              <Camera className="h-6 w-6 text-white" />
            </button>
            {/* Upload spinner overlay */}
            {isUploadingAvatar && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2 text-center sm:text-left">
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="min-h-[44px]"
              >
                <Camera className="mr-2 h-4 w-4" />
                {isUploadingAvatar ? "Uploading..." : "Upload Photo"}
              </Button>
              {avatarUrl && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAvatarRemove}
                  disabled={isUploadingAvatar}
                  className="min-h-[44px]"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              JPG, PNG or WebP. Max size 2MB. Drag &amp; drop or click to upload.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Profile Information</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Update your personal information
          </p>
        </div>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
                minLength={2}
                maxLength={100}
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="min-h-[44px]"
              />
            </div>
          </div>

          {email !== user.email && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Changing your email will require confirmation. You&apos;ll receive
                emails to both your current and new addresses.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              size="lg"
              className="min-h-[44px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Profile"
              )}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
