"use client";

import { Link2 } from "lucide-react";
import { User } from "@/src/lib/auth";
import MediaUploader from "@/src/components/MediaUploader";
import {
  validateAvatarImageFile,
  validateCoverImageFile,
} from "@/src/lib/profileMedia";
import LinkUpCardPreview from "./LinkUpCardPreview";

type LinkUpCardAppearanceEditorProps = {
  user: Pick<
    User,
    | "name"
    | "username"
    | "avatarUrl"
    | "coverUrl"
    | "accountType"
    | "country"
    | "language"
  >;
  avatarUrl: string;
  coverUrl: string;
  disabled?: boolean;
  onAvatarChange: (url: string) => void;
  onCoverChange: (url: string) => void;
  onError?: (message: string | null) => void;
};

const inputShell =
  "flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-brand-dark/70";
const inputClass =
  "w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500";
const labelClass =
  "text-xs font-semibold uppercase tracking-[0.18em] text-brand-primary dark:text-brand-secondary";

export default function LinkUpCardAppearanceEditor({
  user,
  avatarUrl,
  coverUrl,
  disabled = false,
  onAvatarChange,
  onCoverChange,
  onError,
}: LinkUpCardAppearanceEditorProps) {
  const previewUser = {
    ...user,
    avatarUrl: avatarUrl || null,
    coverUrl: coverUrl || null,
  };

  return (
    <div className="space-y-6">
      <div>
        <p className={labelClass}>Card Preview</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          See how your LinkUp Card looks before saving.
        </p>
        <div className="mt-4">
          <LinkUpCardPreview user={previewUser} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-brand-dark/40">
          <div>
            <p className={labelClass}>LinkUp Avatar</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Profile picture · Identity Ring · max 5MB
            </p>
          </div>
          <MediaUploader
            label="Upload LinkUp Avatar"
            accept="image"
            disabled={disabled}
            validateFile={validateAvatarImageFile}
            value={avatarUrl ? { url: avatarUrl, type: "image" } : null}
            onChange={(value) => onAvatarChange(value?.url ?? "")}
            onError={onError}
          />
          <label className="block space-y-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Or paste avatar URL
            </span>
            <div className={inputShell}>
              <Link2 className="h-4 w-4 shrink-0 text-slate-500" />
              <input
                className={inputClass}
                value={avatarUrl}
                onChange={(e) => onAvatarChange(e.target.value)}
                placeholder="https://... or /uploads/..."
                disabled={disabled}
              />
            </div>
          </label>
          <button
            type="button"
            disabled={disabled || !avatarUrl}
            onClick={() => onAvatarChange("")}
            className="linkup-btn-secondary min-h-[40px] text-xs"
          >
            Remove Avatar
          </button>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-brand-dark/40">
          <div>
            <p className={labelClass}>Pulse Cover</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Cover image · max 8MB
            </p>
          </div>
          <MediaUploader
            label="Upload Pulse Cover"
            accept="image"
            disabled={disabled}
            validateFile={validateCoverImageFile}
            value={coverUrl ? { url: coverUrl, type: "image" } : null}
            onChange={(value) => onCoverChange(value?.url ?? "")}
            onError={onError}
          />
          <label className="block space-y-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Or paste cover URL
            </span>
            <div className={inputShell}>
              <Link2 className="h-4 w-4 shrink-0 text-slate-500" />
              <input
                className={inputClass}
                value={coverUrl}
                onChange={(e) => onCoverChange(e.target.value)}
                placeholder="https://... or /uploads/..."
                disabled={disabled}
              />
            </div>
          </label>
          <button
            type="button"
            disabled={disabled || !coverUrl}
            onClick={() => onCoverChange("")}
            className="linkup-btn-secondary min-h-[40px] text-xs"
          >
            Remove Cover
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        TODO: Move avatar/cover uploads to Cloudinary/S3/Supabase Storage for
        permanent production media.
      </p>
    </div>
  );
}
