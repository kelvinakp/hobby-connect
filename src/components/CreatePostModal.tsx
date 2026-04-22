"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  canManageCommunity?: boolean;
}

const MAX_IMAGE_BYTES = 500 * 1024;

export default function CreatePostModal({
  open,
  onClose,
  onCreated,
  canManageCommunity = false,
}: Props) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [role, setRole] = useState<string>("user");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [imageSizeBytes, setImageSizeBytes] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setContent("");
      setFormError("");
      setSuccessMsg("");
      setImageFile(null);
      setImagePreviewUrl(null);
      setImageMimeType(null);
      setImageSizeBytes(null);
      return;
    }

    setTimeout(() => inputRef.current?.focus(), 100);

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setRole((profile as { role: string } | null)?.role ?? "user");
    }
    init();
  }, [open, supabase]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    setSuccessMsg("");

    if (!title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!content.trim()) {
      setFormError("Content is required.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setFormError("You must be signed in.");
      return;
    }

    setSubmitting(true);

    const status = role === "admin" ? "PUBLISHED" : "PENDING_REVIEW";
    const postId = crypto.randomUUID();
    let uploadedPath: string | null = null;
    let uploadedUrl: string | null = null;

    if (imageFile) {
      const fileExt =
        imageFile.name.split(".").pop()?.toLowerCase() ||
        imageFile.type.split("/")[1] ||
        "jpg";
      const objectPath = `${user.id}/${postId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(objectPath, imageFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: imageFile.type,
        });

      if (uploadError) {
        setFormError(`Image upload failed: ${uploadError.message}`);
        setSubmitting(false);
        return;
      }

      uploadedPath = objectPath;
      const { data: publicUrlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(objectPath);
      uploadedUrl = publicUrlData.publicUrl;
    }

    const { error } = await supabase.from("posts").insert({
      id: postId,
      author_id: user.id,
      title: title.trim(),
      content: content.trim(),
      community_id: null,
      status,
      image_path: uploadedPath,
      image_url: uploadedUrl,
      image_mime_type: imageMimeType,
      image_size_bytes: imageSizeBytes,
    });

    if (error) {
      if (uploadedPath) {
        await supabase.storage.from("post-images").remove([uploadedPath]);
      }
      if (error.code === "42501" || error.message.includes("policy")) {
        setFormError("You don't have permission to create posts.");
      } else {
        setFormError(error.message);
      }
      setSubmitting(false);
      return;
    }

    setSubmitting(false);

    if (status === "PUBLISHED") {
      onCreated?.();
      onClose();
    } else {
      setSuccessMsg("Your post has been submitted for admin review.");
      setTitle("");
      setContent("");
      setImageFile(null);
      setImagePreviewUrl(null);
      setImageMimeType(null);
      setImageSizeBytes(null);
      setTimeout(() => {
        onCreated?.();
        onClose();
      }, 2000);
    }
  }

  async function handleImageChange(file: File | null) {
    setFormError("");
    if (!file) {
      setImageFile(null);
      setImagePreviewUrl(null);
      setImageMimeType(null);
      setImageSizeBytes(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setFormError("Only image files are allowed.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setFormError("Image is too large. Maximum size is 500KB.");
      return;
    }

    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setImageMimeType(file.type);
    setImageSizeBytes(file.size);
  }

  if (!open) return null;

  const canPost = role === "admin" || role === "moderator" || canManageCommunity;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[3px]"
        onClick={onClose}
      />

      <div className="relative z-10 mx-4 w-full max-w-xl animate-[fadeScaleIn_200ms_ease-out] rounded-3xl border border-charcoal-100/80 bg-white/95 p-6 shadow-2xl shadow-charcoal-900/10 backdrop-blur-xl dark:border-charcoal-700/80 dark:bg-charcoal-900/80 dark:shadow-black/40">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-charcoal dark:text-white">
            {role === "admin" ? "Publish Post" : "Submit Post for Review"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-charcoal-400 transition-colors hover:bg-charcoal-100 hover:text-charcoal-600 dark:text-charcoal-500 dark:hover:bg-charcoal-700 dark:hover:text-charcoal-200"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!canPost ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
            Only admins and community leaders can create posts.
          </div>
        ) : (
          <>
            {successMsg && (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300">
                {successMsg}
              </div>
            )}

            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
                {formError}
              </div>
            )}

            {role !== "admin" && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                Your post will be reviewed by an admin before it appears in the feed.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="post-title" className="mb-1.5 block text-sm font-medium text-charcoal-600 dark:text-charcoal-200">
                  Title
                </label>
                <input
                  ref={inputRef}
                  id="post-title"
                  type="text"
                  placeholder="Post title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="block w-full rounded-xl border border-charcoal-200 bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-300 shadow-sm transition-all focus:-translate-y-[1px] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 dark:border-charcoal-600 dark:bg-charcoal-800/80 dark:text-white dark:placeholder:text-charcoal-500"
                />
              </div>

              <div>
                <label htmlFor="post-content" className="mb-1.5 block text-sm font-medium text-charcoal-600 dark:text-charcoal-200">
                  Content
                </label>
                <textarea
                  id="post-content"
                  rows={5}
                  placeholder="Write your announcement or news…"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="block w-full resize-none rounded-xl border border-charcoal-200 bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-300 shadow-sm transition-all focus:-translate-y-[1px] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 dark:border-charcoal-600 dark:bg-charcoal-800/80 dark:text-white dark:placeholder:text-charcoal-500"
                />
              </div>

              <div>
                <label htmlFor="post-image" className="mb-1.5 block text-sm font-medium text-charcoal-600 dark:text-charcoal-200">
                  Photo attachment{" "}
                  <span className="font-normal text-charcoal-300 dark:text-charcoal-500">(optional, max 500KB)</span>
                </label>
                <input
                  id="post-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    void handleImageChange(e.target.files?.[0] ?? null);
                  }}
                  className="block w-full rounded-xl border border-charcoal-200 bg-white px-3.5 py-2.5 text-sm text-charcoal shadow-sm transition-all file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-brand focus:-translate-y-[1px] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 dark:border-charcoal-600 dark:bg-charcoal-800/80 dark:text-white dark:file:bg-brand-900/30 dark:file:text-brand-300"
                />
                {imageSizeBytes !== null && (
                  <p className="mt-1 text-xs text-charcoal-400 dark:text-charcoal-500">
                    Selected image: {(imageSizeBytes / 1024).toFixed(1)}KB
                  </p>
                )}
                {imagePreviewUrl && (
                  <div className="relative mt-2 aspect-[16/9] w-full overflow-hidden rounded-lg border border-charcoal-200 dark:border-charcoal-700">
                    <Image
                      src={imagePreviewUrl}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 640px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition-all hover:-translate-y-[1px] hover:shadow-xl hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {role === "admin" ? "Publishing…" : "Submitting…"}
                    </>
                  ) : (
                    role === "admin" ? "Publish" : "Submit for Review"
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-charcoal-500 transition-colors hover:bg-charcoal-100 dark:text-charcoal-400 dark:hover:bg-charcoal-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
