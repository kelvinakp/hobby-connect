import { notFound } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getDisplayName, getInitials } from "@/lib/display-name";
import { SKILL_LEVEL_COLORS, type Skill } from "@/lib/profile-data";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function UserProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("public_profiles")
    .select("id, first_name, last_name, avatar_url")
    .eq("id", id)
    .single();

  if (!profile) {
    notFound();
  }

  const { data: skillsData } = await supabase
    .from("user_skills")
    .select("category, skill_level")
    .eq("user_id", id)
    .order("category", { ascending: true });

  const { data: hobbiesData } = await supabase
    .from("profile_hobbies")
    .select("hobby_name")
    .eq("user_id", id)
    .order("hobby_name", { ascending: true });

  const skills: Skill[] =
    (skillsData as { category: string; skill_level: "noob" | "skilled" | "pro" }[] | null)?.map(
      (row) => ({
        name: row.category,
        level: row.skill_level === "pro" ? "Pro" : row.skill_level === "skilled" ? "Skilled" : "Noob",
      }),
    ) ?? [];

  const hobbies: string[] =
    (hobbiesData as { hobby_name: string }[] | null)?.map((row) => row.hobby_name) ?? [];

  const displayName = getDisplayName(
    { first_name: profile.first_name, last_name: profile.last_name },
    "Student",
  );
  const initials = getInitials({
    first_name: profile.first_name,
    last_name: profile.last_name,
  });

  return (
    <div className="py-8">
      <div className="mx-auto mb-8 max-w-xl">
        <h1 className="text-2xl font-bold tracking-tight text-charcoal dark:text-white">
          {displayName}
        </h1>
      </div>

      <div className="mx-auto max-w-xl space-y-6">
        {/* Profile card */}
        <div className="rounded-xl border border-charcoal-100 bg-white p-6 shadow-sm dark:border-charcoal-700 dark:bg-charcoal-800/60">
          <div className="flex items-center gap-4">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={displayName}
                width={64}
                height={64}
                className="h-16 w-16 shrink-0 rounded-full bg-brand-50 shadow-lg shadow-brand/15 dark:bg-brand-900/30"
                unoptimized
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-400 text-xl font-bold text-white shadow-lg shadow-brand/25">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-lg font-semibold text-charcoal dark:text-white">{displayName}</p>
            </div>
          </div>
        </div>

        {/* Skills & hobbies */}
        <div className="rounded-xl border border-charcoal-100 bg-white p-6 shadow-sm dark:border-charcoal-700 dark:bg-charcoal-800/60">
          {skills.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-charcoal-400 dark:text-charcoal-500">
                Skills
              </p>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <span
                    key={s.name}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${SKILL_LEVEL_COLORS[s.level]}`}
                  >
                    {s.name}
                    <span className="opacity-60">·</span>
                    <span className="text-[10px]">{s.level}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {hobbies.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-charcoal-400 dark:text-charcoal-500">
                Hobbies
              </p>
              <div className="flex flex-wrap gap-1.5">
                {hobbies.map((hobby) => (
                  <span
                    key={hobby}
                    className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                  >
                    {hobby}
                  </span>
                ))}
              </div>
            </div>
          )}

          {skills.length === 0 && hobbies.length === 0 && (
            <p className="text-xs text-charcoal-400 dark:text-charcoal-500">
              This student hasn&apos;t added any skills or hobbies yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

