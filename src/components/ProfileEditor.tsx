"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
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
  const supabase = createClient();

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

  const [skills, setSkills] = useState<Skill[]>([]);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState<Skill["level"]>("Noob");
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);

  const [hobbies, setHobbies] = useState<string[]>([]);
  const [newHobby, setNewHobby] = useState("");
  const [showHobbySuggestions, setShowHobbySuggestions] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, bio, major, avatar_url")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setProfileExists(true);
        const row = data as ProfileRow;
        if (row.first_name) setFirstName(str(row.first_name));
        if (row.last_name) setLastName(str(row.last_name));
        setBio(str(row.bio));
        setMajor(str(row.major));
        setAvatarUrl(typeof row.avatar_url === "string" ? row.avatar_url : null);
      } else {
        console.warn("[Profile] No profile row found, will create on save.");
      }

      const { data: skillsData } = await supabase
        .from("user_skills")
        .select("category, skill_level")
        .eq("user_id", user.id);
      const skillRows = (skillsData as { category: string; skill_level: string }[] | null) ?? [];
      setSkills(skillRows.map((r) => ({ name: r.category, level: dbSkillLevelToDisplay(r.skill_level) })));

      const { data: hobbiesData } = await supabase
        .from("profile_hobbies")
        .select("hobby_name")
        .eq("user_id", user.id);
      const hobbyRows = (hobbiesData as { hobby_name: string }[] | null) ?? [];
      setHobbies(hobbyRows.map((r) => r.hobby_name));

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
      <div className="mx-auto max-w-xl rounded-xl border border-charcoal-100 bg-white p-8 text-center shadow-sm dark:border-charcoal-700 dark:bg-charcoal-800/60">
        <p className="text-sm text-charcoal-400 dark:text-charcoal-300">You must be signed in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* ── Profile Info Card ── */}
      <div className="rounded-xl border border-charcoal-100 bg-white p-6 shadow-sm dark:border-charcoal-700 dark:bg-charcoal-800/60">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Your avatar"
              width={64}
              height={64}
              className="h-16 w-16 shrink-0 rounded-full bg-brand-50 shadow-lg shadow-brand/15 dark:bg-brand-900/30"
              unoptimized
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-400 text-xl font-bold text-white shadow-lg shadow-brand/25">
              {firstName.charAt(0).toUpperCase()}{lastName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-charcoal dark:text-white">
              {firstName || "—"} {lastName || "—"}
            </h2>
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
          <AvatarPicker selected={avatarUrl} onSelect={setAvatarUrl} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="prof-first" className="mb-1.5 block text-sm font-medium text-charcoal-600 dark:text-charcoal-200">First Name</label>
              <input id="prof-first" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="block w-full rounded-lg border border-charcoal-200 bg-white px-3.5 py-2.5 text-sm text-charcoal transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-white" />
            </div>
            <div>
              <label htmlFor="prof-last" className="mb-1.5 block text-sm font-medium text-charcoal-600 dark:text-charcoal-200">Last Name</label>
              <input id="prof-last" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="block w-full rounded-lg border border-charcoal-200 bg-white px-3.5 py-2.5 text-sm text-charcoal transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-white" />
            </div>
          </div>

          {/* Read-only fields */}
          <div className="grid grid-cols-2 gap-4">
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
    </div>
  );
}
