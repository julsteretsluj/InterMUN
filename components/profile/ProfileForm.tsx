"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types/database";

const schema = z.object({
  name: z.string().optional(),
  pronouns: z.string().optional(),
  allocation: z.string().optional(),
  conferences_attended: z.number().min(0).optional(),
  awards: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ProfileFormProps {
  profile: Profile | null;
  userId: string;
  canViewPrivate: boolean;
}

export function ProfileForm({
  profile,
  userId,
  canViewPrivate,
}: ProfileFormProps) {
  const [profilePictureUrl, setProfilePictureUrl] = useState(
    profile?.profile_picture_url || ""
  );
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: profile?.name || "",
      pronouns: profile?.pronouns || "",
      allocation: profile?.allocation || "",
      conferences_attended: profile?.conferences_attended ?? 0,
      awards: profile?.awards?.join(", ") || "",
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name || "",
        pronouns: profile.pronouns || "",
        allocation: profile.allocation || "",
        conferences_attended: profile.conferences_attended ?? 0,
        awards: profile.awards?.join(", ") || "",
      });
      setProfilePictureUrl(profile.profile_picture_url || "");
    }
  }, [profile, reset]);

  async function onSubmit(data: FormData) {
    await supabase
      .from("profiles")
      .upsert({
        id: userId,
        name: data.name,
        pronouns: data.pronouns,
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
      {canViewPrivate && profilePictureUrl && (
        <div className="flex items-center gap-4">
          <img
            src={profilePictureUrl}
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover"
          />
        </div>
      )}
      {canViewPrivate && (
        <div>
          <label className="block text-sm font-medium mb-1">
            Profile picture URL
          </label>
          <input
            type="url"
            value={profilePictureUrl}
            onChange={(e) => setProfilePictureUrl(e.target.value)}
            className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600"
            placeholder="https://..."
          />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          {...register("name")}
          className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Pronouns</label>
        <input
          {...register("pronouns")}
          className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600"
          placeholder="e.g. she/her"
        />
      </div>
      {canViewPrivate && (
        <>
          <div>
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
              className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Awards (comma-separated)
            </label>
            <input
              {...register("awards")}
              className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600"
              placeholder="Best Delegate, Honorable Mention"
            />
          </div>
        </>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">Allocation</label>
        <input
          {...register("allocation")}
          className="w-full px-3 py-2 border rounded-md dark:bg-slate-700 dark:border-slate-600"
          placeholder="e.g. United Kingdom"
        />
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
