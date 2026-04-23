"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types/database";
import { ProfileLivePreview } from "@/components/profile/ProfileLivePreview";
import {
  PROFILE_PRONOUN_PRESETS,
  PROFILE_PRONOUN_PRESET_SET,
  pronounsFormValueFromProfile,
} from "@/lib/profile-pronouns";

type FormData = {
  name?: string;
  username?: string;
  pronouns?: string;
  school?: string;
  grade?: string;
  allocation?: string;
  conferences_attended?: number;
  awards?: string;
};
const GRADE_OPTIONS = [
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
] as const;

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
  const tp = useTranslations("views.profile");
  const router = useRouter();

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().optional(),
        username: z
          .string()
          .trim()
          .optional()
          .refine((v) => v === undefined || v === "" || /^[A-Za-z0-9_.-]{3,32}$/.test(v), {
            message: tp("errUsernamePattern"),
          }),
        pronouns: z
          .string()
          .optional()
          .refine((v) => !v?.trim() || PROFILE_PRONOUN_PRESET_SET.has(v.trim()), {
            message: tp("errPronounsPreset"),
          }),
        school: z.string().optional(),
        grade: z.string().optional(),
        allocation: z.string().optional(),
        conferences_attended: z.number().min(0).optional(),
        awards: z.string().optional(),
      }),
    [tp]
  );
  const [profilePictureUrl, setProfilePictureUrl] = useState(
    profile?.profile_picture_url || ""
  );
  const [uploadPending, setUploadPending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const profilePictureFileRef = useRef<HTMLInputElement>(null);
  const [submitFeedback, setSubmitFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const supabase = createClient();

  const formValues = useMemo(
    (): FormData => ({
      name: profile?.name ?? "",
      username: profile?.username ?? "",
      pronouns: pronounsFormValueFromProfile(profile?.pronouns),
      school: profile?.school ?? "",
      grade: profile?.grade ?? "",
      allocation: profile?.allocation ?? "",
      conferences_attended: profile?.conferences_attended ?? 0,
      awards: profile?.awards?.join(", ") ?? "",
    }),
    [profile]
  );

  async function uploadProfilePicture(file: File) {
    setUploadError(null);
    setUploadSuccess(false);

    if (!file.type.startsWith("image/")) {
      setUploadError(tp("errImageType"));
      return;
    }

    if (!file.size || file.size > 5 * 1024 * 1024) {
      setUploadError(tp("errImageSize"));
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
        const m = uploadErr.message;
        if (/bucket not found/i.test(m)) {
          throw new Error(tp("errStorageSetup"));
        }
        throw new Error(m);
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(objectPath);

      if (!publicUrlData?.publicUrl) {
        throw new Error(tp("errPublicUrl"));
      }

      // Persist URL immediately so the user doesn't have to click "Save profile".
      const { error: persistErr } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            profile_picture_url: publicUrlData.publicUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (persistErr) {
        throw new Error(persistErr.message);
      }

      setProfilePictureUrl(publicUrlData.publicUrl);
      setUploadSuccess(true);
      if (profilePictureFileRef.current) {
        profilePictureFileRef.current.value = "";
      }
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : tp("errUploadFailed");
      setUploadError(msg);
    } finally {
      setUploadPending(false);
    }
  }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: formValues,
  });

  const live = watch();

  const pronounsSelectValue = (watch("pronouns") ?? "").trim();

  const legacyCustomPronouns =
    profile?.pronouns?.trim() && !PROFILE_PRONOUN_PRESET_SET.has(profile.pronouns.trim())
      ? profile.pronouns.trim()
      : null;

  useEffect(() => {
    if (!profile) return;
    // Keep preview URL in sync when server profile updates (e.g. after refresh).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfilePictureUrl(profile.profile_picture_url || "");
  }, [profile?.id, profile?.profile_picture_url, profile?.updated_at]);

  async function onSubmit(data: FormData) {
    setSubmitFeedback(null);
    const normalizedUsername = data.username?.trim().toLowerCase();
    const pt = data.pronouns?.trim();
    const pronounsNorm =
      pt && PROFILE_PRONOUN_PRESET_SET.has(pt) ? pt : null;
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        name: data.name,
        username: normalizedUsername ? normalizedUsername : null,
        pronouns: pronounsNorm,
        school: data.school || null,
        grade: data.grade || null,
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

    if (error) {
      setSubmitFeedback({
        kind: "error",
        message: error.message || tp("saveFailed"),
      });
      return;
    }

    setSubmitFeedback({ kind: "success", message: tp("saved") });
    router.refresh();
  }

  const fieldClass =
    "mun-field min-w-0 rounded-md border border-white/15 bg-black/30 px-3 py-2 text-brand-navy placeholder:text-brand-muted/60";

  return (
    <div className="max-w-6xl">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_min(18rem,92vw)] lg:items-start xl:grid-cols-[minmax(0,1fr)_20rem]">
        <form onSubmit={handleSubmit(onSubmit)} className="min-w-0 space-y-6">
      <div>
        <p className="block text-sm font-medium mb-2">{tp("profilePicture")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="min-w-0">
            <label
              htmlFor="profile-picture-file"
              className="block text-xs text-brand-muted mb-1"
            >
              {tp("uploadFile")}
            </label>
            <input
              ref={profilePictureFileRef}
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
              <p className="text-xs text-brand-muted mt-1">{tp("uploading")}</p>
            )}
            {uploadSuccess && !uploadPending && (
              <p className="text-xs text-brand-muted mt-1" role="status">
                {tp("photoSaved")}
              </p>
            )}
            {uploadError && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-2">
                {uploadError}
              </p>
            )}
          </div>
          <div className="min-w-0">
            <label className="block text-xs text-brand-muted mb-1">
              {tp("orUrl")}
            </label>
            <input
              type="url"
              value={profilePictureUrl}
              onChange={(e) => setProfilePictureUrl(e.target.value)}
              className={fieldClass}
              placeholder={tp("urlPlaceholder")}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="min-w-0">
          <label className="block text-sm font-medium mb-1">{tp("name")}</label>
          <input {...register("name")} className={fieldClass} />
        </div>
        <div className="min-w-0">
          <label className="block text-sm font-medium mb-1">{tp("username")}</label>
          <input
            {...register("username")}
            className={fieldClass}
            placeholder={tp("usernamePlaceholder")}
          />
          {errors.username && (
            <p className="text-sm text-red-600 mt-1">{errors.username.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="min-w-0">
          <label htmlFor="profile-pronouns-select" className="block text-sm font-medium mb-1">
            {tp("pronouns")}
          </label>
          <select
            id="profile-pronouns-select"
            className={fieldClass}
            value={pronounsSelectValue}
            onChange={(e) => {
              setValue("pronouns", e.target.value, { shouldDirty: true, shouldValidate: true });
            }}
          >
            <option value="">—</option>
            {PROFILE_PRONOUN_PRESETS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {legacyCustomPronouns ? (
            <p className="mt-1.5 text-xs text-brand-muted">{tp("customPronounNote")}</p>
          ) : null}
          {errors.pronouns ? (
            <p className="mt-1 text-sm text-red-600">{errors.pronouns.message}</p>
          ) : null}
        </div>
        <div className="min-w-0">
          <label className="block text-sm font-medium mb-1">{tp("school")}</label>
          <input
            {...register("school")}
            className={fieldClass}
            placeholder={tp("schoolPlaceholder")}
          />
        </div>
      </div>

      <div className="min-w-0 sm:max-w-xs">
        <label className="block text-sm font-medium mb-1">{tp("grade")}</label>
        <select {...register("grade")} className={fieldClass}>
          <option value="">{tp("selectGrade")}</option>
          {GRADE_OPTIONS.map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </select>
      </div>

      {canViewPrivate && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="min-w-0">
            <label className="block text-sm font-medium mb-1">{tp("conferencesAttended")}</label>
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
            <label className="block text-sm font-medium mb-1">{tp("awardsComma")}</label>
            <input
              {...register("awards")}
              className={fieldClass}
              placeholder={tp("awardsPlaceholder")}
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">{tp("allocation")}</label>
        {availableAllocations.length > 0 ? (
          <select
            {...register("allocation")}
            className={fieldClass}
          >
            <option value="">{tp("selectAllocation")}</option>
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
            placeholder={tp("noAllocationsPlaceholder")}
          />
        )}
      </div>
      {errors.conferences_attended && (
        <p className="text-sm text-red-600">{errors.conferences_attended.message}</p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="px-4 py-2 bg-brand-accent text-white rounded-md hover:opacity-90 disabled:opacity-50"
      >
        {tp("saveProfile")}
      </button>
      {submitFeedback ? (
        <p
          role="status"
          className={
            submitFeedback.kind === "success"
              ? "text-sm text-brand-muted"
              : "text-sm text-red-600"
          }
        >
          {submitFeedback.message}
        </p>
      ) : null}
        </form>

        <ProfileLivePreview
          imageUrl={profilePictureUrl}
          name={live.name ?? ""}
          username={live.username ?? ""}
          pronouns={live.pronouns ?? ""}
          school={live.school ?? ""}
          grade={live.grade ?? ""}
          allocation={live.allocation ?? ""}
          conferencesAttended={live.conferences_attended}
          awardsRaw={live.awards ?? ""}
          canViewPrivate={canViewPrivate}
        />
      </div>
    </div>
  );
}
