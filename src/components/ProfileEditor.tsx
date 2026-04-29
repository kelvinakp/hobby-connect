"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import AvatarPicker from "@/components/AvatarPicker";
import { PasswordInput } from "@/components/PasswordInput";
import {
  type Skill,
  SKILL_LEVEL_OPTIONS,
  SKILL_LEVEL_COLORS,
  SUGGESTED_SKILLS,
  SUGGESTED_HOBBIES,
} from "@/lib/profile-data";
import {
  SOCIAL_PLATFORM_OPTIONS,
  type SocialLinkItem,
  type SocialPlatform,
  getSocialMeta,
  normalizeSocialUrl,
} from "@/lib/social-links";
import SocialPlatformIcon from "@/components/SocialPlatformIcon";

interface AuthInfo {
  id: string;
  email: string;
  studentId: string;
  firstName: string;
  lastName: string;
}

interface ProfileRow {
  [key: string]: unknown;
}

function dbSkillLevelToDisplay(db: string): Skill["level"] {
  const map: Record<string, Skill["level"]> = { noob: "Noob", skilled: "Skilled", pro: "Pro" };
  return map[db] ?? "Noob";
}

function displayLevelToDb(level: Skill["level"]): "noob" | "skilled" | "pro" {
  return level.charAt(0).toLowerCase() + level.slice(1).toLowerCase() as "noob" | "skilled" | "pro";
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export default function ProfileEditor() {
  const supabase = useMemo(() => createClient(), []);

  const [auth, setAuth] = useState<AuthInfo | null>(null);
  const [profileExists, setProfileExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [major, setMajor] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");

  const [skills, setSkills] = useState<Skill[]>([]);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState<Skill["level"]>("Noob");
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);

  const [hobbies, setHobbies] = useState<string[]>([]);
  const [newHobby, setNewHobby] = useState("");
  const [showHobbySuggestions, setShowHobbySuggestions] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>([]);
  const [socialPlatform, setSocialPlatform] = useState<SocialPlatform>("facebook");
  const [socialInput, setSocialInput] = useState("");

  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const authInfo: AuthInfo = {
        id: user.id,
        email: user.email ?? "",
        studentId: str(meta.student_id),
        firstName: str(meta.first_name),
        lastName: str(meta.last_name),
      };
      setAuth(authInfo);

      setFirstName(authInfo.firstName);
      setLastName(authInfo.lastName);

      const [profileRes, metaRes, skillsRes, hobbiesRes, socialRes] = await Promise.all([
        supabase.from("profiles").select("first_name, last_name, bio, major, avatar_url").eq("id", user.id).single(),
        supabase.from("public_profile_meta").select("nickname").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_skills").select("category, skill_level").eq("user_id", user.id),
        supabase.from("profile_hobbies").select("hobby_name").eq("user_id", user.id),
        supabase.from("profile_social_links").select("platform, url").eq("user_id", user.id).order("created_at", { ascending: true }),
      ]);

      if (!profileRes.error && profileRes.data) {
        setProfileExists(true);
        const row = profileRes.data as ProfileRow;
        if (row.first_name) setFirstName(str(row.first_name));
        if (row.last_name) setLastName(str(row.last_name));
        setBio(str(row.bio));
        setMajor(str(row.major));
        setAvatarUrl(typeof row.avatar_url === "string" ? row.avatar_url : null);
      }

      setNickname((metaRes.data as { nickname: string | null } | null)?.nickname ?? "");

      const skillRows = (skillsRes.data as { category: string; skill_level: string }[] | null) ?? [];
      setSkills(skillRows.map((r) => ({ name: r.category, level: dbSkillLevelToDisplay(r.skill_level) })));

      const hobbyRows = (hobbiesRes.data as { hobby_name: string }[] | null) ?? [];
      setHobbies(hobbyRows.map((r) => r.hobby_name));

      const socialRows = (socialRes.data as { platform: string; url: string }[] | null) ?? [];
      setSocialLinks(
        socialRows
          .filter((row) => SOCIAL_PLATFORM_OPTIONS.some((opt) => opt.id === row.platform))
          .map((row) => ({ platform: row.platform as SocialPlatform, url: row.url }))
      );

      setLoading(false);
    }
    load();
  }, [supabase]);

  function addSkill() {
    const name = newSkillName.trim();
    if (!name || skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) return;
    setSkills((prev) => [...prev, { name, level: newSkillLevel }]);
    setNewSkillName("");
    setNewSkillLevel("Noob");
    setShowSkillSuggestions(false);
  }

  function removeSkill(name: string) {
    setSkills((prev) => prev.filter((s) => s.name !== name));
  }

  const filteredSkillSuggestions = SUGGESTED_SKILLS.filter(
    (s) => s.toLowerCase().includes(newSkillName.toLowerCase()) && !skills.some((sk) => sk.name.toLowerCase() === s.toLowerCase())
  );

  function addHobby(value?: string) {
    const name = (value ?? newHobby).trim();
    if (!name || hobbies.some((h) => h.toLowerCase() === name.toLowerCase())) return;
    setHobbies((prev) => [...prev, name]);
    setNewHobby("");
    setShowHobbySuggestions(false);
  }

  function removeHobby(name: string) {
    setHobbies((prev) => prev.filter((h) => h !== name));
  }

  function addSocialLink() {
    const normalized = normalizeSocialUrl(socialPlatform, socialInput);
    if (!normalized) return;
    if (socialLinks.some((s) => s.platform === socialPlatform)) return;
    setSocialLinks((prev) => [...prev, { platform: socialPlatform, url: normalized }]);
    setSocialInput("");
  }

  function removeSocialLink(platform: SocialPlatform) {
    setSocialLinks((prev) => prev.filter((s) => s.platform !== platform));
  }

  const filteredHobbySuggestions = SUGGESTED_HOBBIES.filter(
    (s) => s.toLowerCase().includes(newHobby.toLowerCase()) && !hobbies.includes(s)
  );

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!firstName.trim() || !lastName.trim()) {
      setMessage({ type: "error", text: "First and last name are required." });
      return;
    }
    if (!auth) return;

    setSaving(true);

    const payload = {
      id: auth.id,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: auth.email,
      student_id: auth.studentId || null,
      bio: bio.trim() || null,
      major: major.trim() || null,
      avatar_url: avatarUrl,
    };

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });

    if (profileError) {
      console.error("[Profile] Save failed:", profileError.message);
      setMessage({ type: "error", text: profileError.message });
      setSaving(false);
      return;
    }

    await supabase.from("user_skills").delete().eq("user_id", auth.id);
    if (skills.length > 0) {
      await supabase.from("user_skills").insert(
        skills.map((s) => ({
          user_id: auth.id,
          category: s.name,
          skill_level: displayLevelToDb(s.level),
        }))
      );
    }

    await supabase.from("profile_hobbies").delete().eq("user_id", auth.id);
    if (hobbies.length > 0) {
      await supabase.from("profile_hobbies").insert(
        hobbies.map((hobby_name) => ({ user_id: auth.id, hobby_name }))
      );
    }

    await supabase
      .from("public_profile_meta")
      .upsert(
        {
          user_id: auth.id,
          nickname: nickname.trim() || null,
        },
        { onConflict: "user_id" }
      );

    await supabase.from("profile_social_links").delete().eq("user_id", auth.id);
    if (socialLinks.length > 0) {
      await supabase.from("profile_social_links").insert(
        socialLinks.map((s) => ({
          user_id: auth.id,
          platform: s.platform,
          url: s.url,
        }))
      );
    }

    setProfileExists(true);
    setMessage({ type: "success", text: "Profile updated!" });
    setSaving(false);
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    if (!currentPassword) {
      setPasswordMsg({ type: "error", text: "Current password is required." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Passwords do not match." });
      return;
    }
    if (!auth) return;
    setPasswordSaving(true);
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: auth.email,
      password: currentPassword,
    });
    if (reauthError) {
      setPasswordMsg({ type: "error", text: "Current password is incorrect." });
      setPasswordSaving(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordMsg({ type: "error", text: error.message });
    } else {
      setPasswordMsg({ type: "success", text: "Password updated successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setChangingPassword(false);
    }
    setPasswordSaving(false);
  }

  const canSubmitPasswordChange =
    currentPassword.trim().length > 0 &&
    newPassword.length >= 8 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword &&
    !passwordSaving;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand border-t-transparent" />
      </div>
    );
  }

  if (!auth) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-charcoal-100 bg-white p-5 text-center shadow-sm dark:border-charcoal-700 dark:bg-charcoal-800/60 sm:p-8">
        <p className="text-sm text-charcoal-400 dark:text-charcoal-300">You must be signed in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* ── Profile Info Card ── */}
      <div className="rounded-xl border border-charcoal-100 bg-white p-6 shadow-sm dark:border-charcoal-700 dark:bg-charcoal-800/60">
        <div className="flex items-center gap-4">
          <div className="relative" ref={avatarMenuRef}>
            <button
              type="button"
              onClick={() => setAvatarMenuOpen((p) => !p)}
              className="group relative h-16 w-16 shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-brand/30 focus:ring-offset-2 dark:focus:ring-offset-charcoal-800"
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Your avatar"
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-full bg-brand-50 shadow-lg shadow-brand/15 dark:bg-brand-900/30"
                  unoptimized
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-400 text-xl font-bold text-white shadow-lg shadow-brand/25">
                  {firstName.charAt(0).toUpperCase()}{lastName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/30">
                <svg className="h-4 w-4 text-white opacity-0 transition-opacity group-hover:opacity-100" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                </svg>
              </span>
            </button>

            {avatarMenuOpen && (
              <div className="absolute left-0 top-full z-30 mt-2 w-40 overflow-hidden rounded-xl border border-charcoal-200 bg-white shadow-xl dark:border-charcoal-600 dark:bg-charcoal-800">
                <button
                  type="button"
                  onClick={() => { setAvatarMenuOpen(false); setAvatarPickerOpen(true); }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-charcoal-700 transition-colors hover:bg-brand-50 hover:text-brand dark:text-charcoal-200 dark:hover:bg-charcoal-700 dark:hover:text-brand-300"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
                  Edit Avatar
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => { setAvatarUrl(null); setAvatarMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 border-t border-charcoal-100 px-3.5 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-charcoal-700 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                    Remove Avatar
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-charcoal dark:text-white">
              {firstName || "—"} {lastName || "—"}
            </h2>
            {nickname.trim() && (
              <p className="text-xs font-medium text-brand dark:text-brand-300">
                @{nickname.trim()}
              </p>
            )}
            <p className="text-sm text-charcoal-400 dark:text-charcoal-300">{auth.email}</p>
            {auth.studentId && (
              <p className="mt-0.5 text-xs text-charcoal-300 dark:text-charcoal-500">
                Student ID: {auth.studentId}
              </p>
            )}
            {major && (
              <p className="mt-0.5 text-xs text-charcoal-300 dark:text-charcoal-500">{major}</p>
            )}
          </div>
        </div>

        {bio && (
          <p className="mt-4 rounded-lg bg-charcoal-50/50 px-3 py-2 text-sm leading-relaxed text-charcoal-500 dark:bg-charcoal-800/40 dark:text-charcoal-300">
            {bio}
          </p>
        )}

        {skills.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-charcoal-400 dark:text-charcoal-500">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <span key={s.name} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${SKILL_LEVEL_COLORS[s.level]}`}>
                  {s.name} <span className="opacity-60">·</span> <span className="text-[10px]">{s.level}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {hobbies.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-charcoal-400 dark:text-charcoal-500">Hobbies</p>
            <div className="flex flex-wrap gap-1.5">
              {hobbies.map((h) => (
                <span key={h} className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{h}</span>
              ))}
            </div>
          </div>
        )}

        {socialLinks.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-charcoal-400 dark:text-charcoal-500">
              Social Links
            </p>
            <div className="flex flex-wrap gap-2">
              {socialLinks.map((item) => {
                const meta = getSocialMeta(item.platform);
                if (!meta) return null;
                return (
                  <a
                    key={item.platform}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-charcoal-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-charcoal-600 transition-colors hover:border-brand hover:text-brand dark:border-charcoal-600 dark:bg-charcoal-800/60 dark:text-charcoal-200 dark:hover:border-brand-400 dark:hover:text-brand-300"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-charcoal-100 dark:bg-charcoal-700">
                      <SocialPlatformIcon platform={item.platform} className="h-3.5 w-3.5" />
                    </span>
                    {meta.label}
                  </a>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ── Edit Form ── */}
      <div className="rounded-xl border border-charcoal-100 bg-white p-6 shadow-sm dark:border-charcoal-700 dark:bg-charcoal-800/60">
        <h3 className="mb-5 text-base font-semibold text-charcoal dark:text-white">Edit Profile</h3>

        {message && (
          <div className={`mb-5 rounded-lg border px-4 py-2.5 text-sm ${message.type === "success" ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300" : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="prof-first" className="mb-1.5 block text-sm font-medium text-charcoal-600 dark:text-charcoal-200">First Name</label>
              <input id="prof-first" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="block w-full rounded-lg border border-charcoal-200 bg-white px-3.5 py-2.5 text-sm text-charcoal transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-white" />
            </div>
            <div>
              <label htmlFor="prof-last" className="mb-1.5 block text-sm font-medium text-charcoal-600 dark:text-charcoal-200">Last Name</label>
              <input id="prof-last" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="block w-full rounded-lg border border-charcoal-200 bg-white px-3.5 py-2.5 text-sm text-charcoal transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-white" />
            </div>
          </div>

          <div>
            <label htmlFor="prof-nickname" className="mb-1.5 block text-sm font-medium text-charcoal-600 dark:text-charcoal-200">
              Nickname <span className="font-normal text-charcoal-300 dark:text-charcoal-500">(optional)</span>
            </label>
            <input
              id="prof-nickname"
              type="text"
              placeholder="e.g. bee_dev"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="block w-full rounded-lg border border-charcoal-200 bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-300 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-white dark:placeholder:text-charcoal-500"
            />
          </div>

          {/* Read-only fields */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-charcoal-600 dark:text-charcoal-200">Email</label>
              <input type="text" value={auth.email} readOnly className="block w-full rounded-lg border border-charcoal-200 bg-charcoal-50 px-3.5 py-2.5 text-sm text-charcoal-400 dark:border-charcoal-600 dark:bg-charcoal-800/50 dark:text-charcoal-400" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-charcoal-600 dark:text-charcoal-200">Student ID</label>
              <input type="text" value={auth.studentId || "—"} readOnly className="block w-full rounded-lg border border-charcoal-200 bg-charcoal-50 px-3.5 py-2.5 text-sm text-charcoal-400 dark:border-charcoal-600 dark:bg-charcoal-800/50 dark:text-charcoal-400" />
            </div>
          </div>

          <div>
            <label htmlFor="prof-major" className="mb-1.5 block text-sm font-medium text-charcoal-600 dark:text-charcoal-200">Major / Faculty</label>
            <input id="prof-major" type="text" placeholder="e.g. Computer Science" value={major} onChange={(e) => setMajor(e.target.value)} className="block w-full rounded-lg border border-charcoal-200 bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-300 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-white dark:placeholder:text-charcoal-500" />
          </div>

          <div>
            <label htmlFor="prof-bio" className="mb-1.5 block text-sm font-medium text-charcoal-600 dark:text-charcoal-200">Bio <span className="font-normal text-charcoal-300 dark:text-charcoal-500">(optional)</span></label>
            <textarea id="prof-bio" rows={3} placeholder="Tell others about yourself…" value={bio} onChange={(e) => setBio(e.target.value)} className="block w-full resize-none rounded-lg border border-charcoal-200 bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-300 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-white dark:placeholder:text-charcoal-500" />
          </div>

          {/* ── Skills ── */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-charcoal-600 dark:text-charcoal-200">My Skills</label>
            {skills.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <span key={s.name} className={`inline-flex items-center gap-1.5 rounded-full py-1 pl-2.5 pr-1.5 text-xs font-semibold ${SKILL_LEVEL_COLORS[s.level]}`}>
                    {s.name} <span className="opacity-50">·</span> <span className="text-[10px]">{s.level}</span>
                    <button type="button" onClick={() => removeSkill(s.name)} className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10" aria-label={`Remove ${s.name}`}>
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input type="text" placeholder="Type a skill…" value={newSkillName} onChange={(e) => { setNewSkillName(e.target.value); setShowSkillSuggestions(true); }} onFocus={() => setShowSkillSuggestions(true)} onBlur={() => setTimeout(() => setShowSkillSuggestions(false), 150)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} className="block w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm text-charcoal placeholder:text-charcoal-300 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-white dark:placeholder:text-charcoal-500" />
                {showSkillSuggestions && newSkillName && filteredSkillSuggestions.length > 0 && (
                  <div className="absolute left-0 top-full z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-charcoal-200 bg-white shadow-lg dark:border-charcoal-600 dark:bg-charcoal-800">
                    {filteredSkillSuggestions.slice(0, 6).map((s) => (
                      <button key={s} type="button" onMouseDown={(e) => { e.preventDefault(); setNewSkillName(s); setShowSkillSuggestions(false); }} className="block w-full px-3 py-2 text-left text-sm text-charcoal-600 transition-colors hover:bg-brand-50 hover:text-brand dark:text-charcoal-200 dark:hover:bg-charcoal-700 dark:hover:text-brand-300">{s}</button>
                    ))}
                  </div>
                )}
              </div>
              <select value={newSkillLevel} onChange={(e) => setNewSkillLevel(e.target.value as Skill["level"])} className="w-28 rounded-lg border border-charcoal-200 bg-white px-2 py-2 text-sm text-charcoal transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-white">
                {SKILL_LEVEL_OPTIONS.map((lvl) => (<option key={lvl} value={lvl}>{lvl}</option>))}
              </select>
              <button type="button" onClick={addSkill} disabled={!newSkillName.trim()} className="shrink-0 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40">Add</button>
            </div>
          </div>

          {/* ── Hobbies ── */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-charcoal-600 dark:text-charcoal-200">My Hobbies</label>
            {hobbies.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {hobbies.map((h) => (
                  <span key={h} className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 py-1 pl-2.5 pr-1.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    {h}
                    <button type="button" onClick={() => removeHobby(h)} className="rounded-full p-0.5 transition-colors hover:bg-amber-200/50 dark:hover:bg-amber-300/10" aria-label={`Remove ${h}`}>
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <input type="text" placeholder="Type a hobby and press Enter…" value={newHobby} onChange={(e) => { setNewHobby(e.target.value); setShowHobbySuggestions(true); }} onFocus={() => setShowHobbySuggestions(true)} onBlur={() => setTimeout(() => setShowHobbySuggestions(false), 150)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHobby(); } }} className="block w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm text-charcoal placeholder:text-charcoal-300 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-white dark:placeholder:text-charcoal-500" />
              {showHobbySuggestions && filteredHobbySuggestions.length > 0 && (
                <div className="absolute left-0 top-full z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-charcoal-200 bg-white shadow-lg dark:border-charcoal-600 dark:bg-charcoal-800">
                  {filteredHobbySuggestions.slice(0, 6).map((s) => (
                    <button key={s} type="button" onMouseDown={(e) => { e.preventDefault(); addHobby(s); }} className="block w-full px-3 py-2 text-left text-sm text-charcoal-600 transition-colors hover:bg-amber-50 hover:text-amber-700 dark:text-charcoal-200 dark:hover:bg-charcoal-700 dark:hover:text-amber-300">{s}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Social Links ── */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-charcoal-600 dark:text-charcoal-200">
              Social Links
            </label>
            {socialLinks.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {socialLinks.map((item) => {
                  const meta = getSocialMeta(item.platform);
                  if (!meta) return null;
                  return (
                    <span
                      key={item.platform}
                      className="inline-flex items-center gap-1.5 rounded-full border border-charcoal-200 bg-charcoal-50 py-1 pl-2.5 pr-1.5 text-xs font-medium text-charcoal-700 dark:border-charcoal-600 dark:bg-charcoal-800/60 dark:text-charcoal-200"
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-charcoal-700">
                        <SocialPlatformIcon platform={item.platform} className="h-3.5 w-3.5" />
                      </span>
                      {meta.label}
                      <button
                        type="button"
                        onClick={() => removeSocialLink(item.platform)}
                        className="rounded-full p-0.5 transition-colors hover:bg-charcoal-200/70 dark:hover:bg-charcoal-700"
                        aria-label={`Remove ${meta.label}`}
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={socialPlatform}
                onChange={(e) => setSocialPlatform(e.target.value as SocialPlatform)}
                className="w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm text-charcoal transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-white sm:w-40"
              >
                {SOCIAL_PLATFORM_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Paste profile URL or username"
                value={socialInput}
                onChange={(e) => setSocialInput(e.target.value)}
                className="block w-full flex-1 rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm text-charcoal placeholder:text-charcoal-300 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-white dark:placeholder:text-charcoal-500"
              />
              <button
                type="button"
                onClick={addSocialLink}
                disabled={!socialInput.trim() || socialLinks.some((s) => s.platform === socialPlatform)}
                className="shrink-0 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add Social
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-charcoal-400 dark:text-charcoal-500">
              Choose one platform and one link at a time. You can remove and update anytime.
            </p>
          </div>

          <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand/25 transition-all hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? (<><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Saving…</>) : "Save Changes"}
          </button>
        </form>
      </div>

      {/* ── Change Password ── */}
      <div className="rounded-xl border border-charcoal-100 bg-white p-6 shadow-sm dark:border-charcoal-700 dark:bg-charcoal-800/60">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-charcoal dark:text-white">Security</h3>
          {!changingPassword && (
            <button type="button" onClick={() => { setChangingPassword(true); setPasswordMsg(null); }} className="text-sm font-medium text-brand hover:text-brand-600 dark:text-brand-300 dark:hover:text-brand-200">
              Change Password
            </button>
          )}
        </div>

        {passwordMsg && (
          <div className={`mt-4 rounded-lg border px-4 py-2.5 text-sm ${passwordMsg.type === "success" ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300" : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"}`}>
            {passwordMsg.text}
          </div>
        )}

        {changingPassword && (
          <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
            <PasswordInput
              id="current-pw"
              label="Current Password"
              placeholder="Enter your current password"
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
            />
            <PasswordInput
              id="new-pw"
              label="New Password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={setNewPassword}
              minLength={8}
              autoComplete="new-password"
            />
            <PasswordInput
              id="confirm-pw"
              label="Confirm New Password"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />
            <div className="flex gap-3">
              <button type="submit" disabled={!canSubmitPasswordChange} className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand/25 transition-all hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50">
                {passwordSaving ? "Updating…" : "Update Password"}
              </button>
              <button type="button" onClick={() => { setChangingPassword(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setPasswordMsg(null); }} className="rounded-lg px-4 py-2.5 text-sm font-medium text-charcoal-500 transition-colors hover:bg-charcoal-100 dark:text-charcoal-400 dark:hover:bg-charcoal-800">
                Cancel
              </button>
            </div>
          </form>
        )}

        {!changingPassword && !passwordMsg && (
          <p className="mt-2 text-xs text-charcoal-400 dark:text-charcoal-500">
            Update your password to keep your account secure.
          </p>
        )}
      </div>

      {/* Avatar Picker Modal */}
      {avatarPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-charcoal-100 bg-white p-6 shadow-2xl dark:border-charcoal-700 dark:bg-charcoal-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-charcoal dark:text-white">Choose Avatar</h3>
              <button
                type="button"
                onClick={() => setAvatarPickerOpen(false)}
                className="rounded-lg p-1.5 text-charcoal-400 transition-colors hover:bg-charcoal-100 hover:text-charcoal-600 dark:text-charcoal-500 dark:hover:bg-charcoal-700 dark:hover:text-charcoal-200"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <AvatarPicker
              selected={avatarUrl}
              onSelect={(url) => {
                setAvatarUrl(url);
                setAvatarPickerOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
