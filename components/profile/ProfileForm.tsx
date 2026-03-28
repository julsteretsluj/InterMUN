"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types/database";

const schema = z.object({
  name: z.string().optional(),
  username: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => v === undefined || v === "" || /^[A-Za-z0-9_.-]{3,32}$/.test(v),
      "Username must be 3-32 chars (letters, numbers, _, ., -)"
    ),
  pronouns: z.string().optional(),
  school: z.string().optional(),
  allocation: z.string().optional(),
  conferences_attended: z.number().min(0).optional(),
  awards: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ProfileFormProps {
  profile: Profile | null;
  userId: string;
  canViewPrivate: boolean;
  availableAllocations: string[];
}

export function ProfileForm({
  profile,
  userId,
  canViewPrivate,
  availableAllocations,
}: ProfileFormProps) {
  const [profilePictureUrl, setProfilePictureUrl] = useState(
    profile?.profile_picture_url || ""
  );
  const [uploadPending, setUploadPending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const supabase = createClient();

  async function uploadProfilePicture(file: File) {
    setUploadError(null);

    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file.");
      return;
    }

    if (!file.size || file.size > 5 * 1024 * 1024) {
      setUploadError("Image is too large (max 5 MB).");
      return;
    }

    setUploadPending(true);
    try {
      // Storage bucket must exist in Supabase: `profile-pictures`.
      // Public URL is used so the <img> can load directly.
      const bucketName = "profile-pictures";
      const ext = file.name.split(".").pop()?.toLowerCase() || "img";
      const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "img";
      const objectPath = `profiles/${userId}/${Date.now()}.${safeExt}`;

      const { error: uploadErr } = await supabase.storage
        .from(bucketName)
        .upload(objectPath, file, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadErr) {
        throw new Error(uploadErr.message);
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(objectPath);

      if (!publicUrlData?.publicUrl) {
        throw new Error("Could not resolve public URL for uploaded image.");
      }

      // Persist URL immediately so the user doesn't have to click "Save profile".
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          profile_picture_url: publicUrlData.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateErr) {
        throw new Error(updateErr.message);
      }

      setProfilePictureUrl(publicUrlData.publicUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed.";
      setUploadError(msg);
    } finally {
      setUploadPending(false);
    }
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: profile?.name || "",
      username: profile?.username || "",
      pronouns: profile?.pronouns || "",
      school: profile?.school || "",
      allocation: profile?.allocation || "",
      conferences_attended: profile?.conferences_attended ?? 0,
      awards: profile?.awards?.join(", ") || "",
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name || "",
        username: profile.username || "",
        pronouns: profile.pronouns || "",
        school: profile.school || "",
        allocation: profile.allocation || "",
        conferences_attended: profile.conferences_attended ?? 0,
        awards: profile.awards?.join(", ") || "",
      });
      // This state is only derived from the loaded profile; disabling the rule avoids
      // cascading render warnings from the linter's heuristics.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfilePictureUrl(profile.profile_picture_url || "");
    }
  }, [profile, reset]);

  async function onSubmit(data: FormData) {
    const normalizedUsername = data.username?.trim().toLowerCase();
    await supabase
      .from("profiles")
      .upsert({
        id: userId,
        name: data.name,
        username: normalizedUsername ? normalizedUsername : null,
        pronouns: data.pronouns,
        school: data.school || null,
        allocation: data.allocation,
        ...(canViewPrivate && {
          conferences_attended: data.conferences_attended ?? 0,
          awards: data.awards
            ? data.awards.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
        }),
        profile_picture_url: profilePictureUrl || null,
        updated_at: new Date().toISOString(),
      });
  }

  const fieldClass =
    "w-full min-w-0 px-3 py-2 border rounded-md bg-white text-brand-navy placeholder:text-brand-navy/50 dark:bg-slate-700 dark:text-brand-navy dark:border-slate-600 dark:placeholder:text-brand-navy/50";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      {!!profilePictureUrl && (
        <div className="flex items-center gap-4">
          <img
            src={profilePictureUrl}
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover"
          />
        </div>
      )}

      <div>
        <p className="block text-sm font-medium mb-2">Profile picture</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="min-w-0">
            <label
              htmlFor="profile-picture-file"
              className="block text-xs text-brand-muted mb-1"
            >
              Upload file
            </label>
            <input
              type="file"
              id="profile-picture-file"
              accept="image/*"
              name="profilePictureFile"
              disabled={uploadPending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void uploadProfilePicture(file);
              }}
              className="w-full min-w-0"
            />
            {uploadPending && (
              <p className="text-xs text-brand-muted mt-1">Uploading…</p>
            )}
            {uploadError && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-2">
                {uploadError}
              </p>
            )}
          </div>
          <div className="min-w-0">
            <label className="block text-xs text-brand-muted mb-1">
              Or set by URL
            </label>
            <input
              type="url"
              value={profilePictureUrl}
              onChange={(e) => setProfilePictureUrl(e.target.value)}
              className={fieldClass}
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="min-w-0">
          <label className="block text-sm font-medium mb-1">Name</label>
          <input {...register("name")} className={fieldClass} />
        </div>
        <div className="min-w-0">
          <label className="block text-sm font-medium mb-1">Username</label>
          <input
            {...register("username")}
            className={fieldClass}
            placeholder="e.g. alex_1999"
          />
          {errors.username && (
            <p className="text-sm text-red-600 mt-1">{errors.username.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="min-w-0">
          <label className="block text-sm font-medium mb-1">Pronouns</label>
          <input
            {...register("pronouns")}
            className={fieldClass}
            placeholder="e.g. she/her"
          />
        </div>
        <div className="min-w-0">
          <label className="block text-sm font-medium mb-1">School</label>
          <input
            {...register("school")}
            className={fieldClass}
            placeholder="e.g. Lincoln High School"
          />
        </div>
      </div>

      {canViewPrivate && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="min-w-0">
            <label className="block text-sm font-medium mb-1">
              Conferences attended
            </label>
            <input
              type="number"
              {...register("conferences_attended", {
                setValueAs: (value) => {
                  if (value === "" || value == null) return undefined;
                  const parsed = Number(value);
                  return Number.isNaN(parsed) ? undefined : parsed;
                },
              })}
              className={fieldClass}
              min={0}
            />
          </div>
          <div className="min-w-0">
            <label className="block text-sm font-medium mb-1">
              Awards (comma-separated)
            </label>
            <input
              {...register("awards")}
              className={fieldClass}
              placeholder="Best Delegate, Honorable Mention"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Allocation</label>
        {availableAllocations.length > 0 ? (
          <select
            {...register("allocation")}
            className={fieldClass}
          >
            <option value="">Select allocation</option>
            {availableAllocations.map((allocation) => (
              <option key={allocation} value={allocation}>
                {allocation}
              </option>
            ))}
          </select>
        ) : (
          <input
            {...register("allocation")}
            className={fieldClass}
            placeholder="No committee allocations available"
          />
        )}
      </div>
      {errors.conferences_attended && (
        <p className="text-sm text-red-600">{errors.conferences_attended.message}</p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        Save profile
      </button>
    </form>
  );
}
