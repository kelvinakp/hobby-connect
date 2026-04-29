import { notFound } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getDisplayName, getInitials } from "@/lib/display-name";
import { SKILL_LEVEL_COLORS, type Skill } from "@/lib/profile-data";
import { getSocialMeta, type SocialPlatform } from "@/lib/social-links";
import SocialPlatformIcon from "@/components/SocialPlatformIcon";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function UserProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [profileRes, skillsRes, hobbiesRes, metaRes, socialRes] = await Promise.all([
    supabase.from("profiles").select("id, first_name, last_name, avatar_url, bio, major, email, student_id").eq("id", id).single(),
    supabase.from("user_skills").select("category, skill_level").eq("user_id", id).order("category", { ascending: true }),
    supabase.from("profile_hobbies").select("hobby_name").eq("user_id", id).order("hobby_name", { ascending: true }),
    supabase.from("public_profile_meta").select("nickname").eq("user_id", id).maybeSingle(),
    supabase.from("profile_social_links").select("platform, url").eq("user_id", id).order("created_at", { ascending: true }),
  ]);

  const profile = profileRes.data as {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    major: string | null;
    email: string | null;
    student_id: string | null;
  } | null;
  if (!profile) notFound();

  const { data: skillsData } = skillsRes;
  const { data: hobbiesData } = hobbiesRes;
  const { data: metaData } = metaRes;
  const { data: socialData } = socialRes;

  const skills: Skill[] =
    (skillsData as { category: string; skill_level: "noob" | "skilled" | "pro" }[] | null)?.map(
      (row) => ({
        name: row.category,
        level: row.skill_level === "pro" ? "Pro" : row.skill_level === "skilled" ? "Skilled" : "Noob",
      }),
    ) ?? [];

  const hobbies: string[] =
    (hobbiesData as { hobby_name: string }[] | null)?.map((row) => row.hobby_name) ?? [];
  const nickname = (metaData as { nickname: string | null } | null)?.nickname ?? "";
  const socialLinks =
    (socialData as { platform: string; url: string }[] | null)
      ?.filter((row) => Boolean(getSocialMeta(row.platform as SocialPlatform)))
      .map((row) => ({
        platform: row.platform as SocialPlatform,
        url: row.url,
      })) ?? [];

  const displayName = getDisplayName(
    { first_name: profile.first_name, last_name: profile.last_name },
    "Student",
  );
  const initials = getInitials({
    first_name: profile.first_name,
    last_name: profile.last_name,
  });

  const hasDetails = skills.length > 0 || hobbies.length > 0 || socialLinks.length > 0 || profile.bio;

  return (
    <div className="py-6">
      <div className="mx-auto max-w-xl">
        {/* Main card */}
        <div className="overflow-hidden rounded-2xl border border-charcoal-100 bg-white shadow-lg shadow-charcoal-900/5 dark:border-charcoal-700 dark:bg-charcoal-800/70 dark:shadow-black/20">

          {/* Banner */}
          <div className="relative h-28 bg-gradient-to-br from-brand via-brand-500 to-brand-700 sm:h-32">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.12),transparent_60%)]" />
          </div>

          {/* Avatar + name section */}
          <div className="relative px-4 pb-5 sm:px-6">
            <div className="-mt-12 flex items-end gap-4 sm:-mt-14">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={displayName}
                  width={96}
                  height={96}
                  className="h-20 w-20 shrink-0 rounded-2xl border-4 border-white bg-brand-50 shadow-xl shadow-brand/20 dark:border-charcoal-800 dark:bg-brand-900/30 sm:h-24 sm:w-24"
                  unoptimized
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-brand to-brand-400 text-2xl font-bold text-white shadow-xl shadow-brand/25 dark:border-charcoal-800 sm:h-24 sm:w-24 sm:text-3xl">
                  {initials}
                </div>
              )}

              <div className="min-w-0 pb-1">
                <h1 className="text-xl font-bold tracking-tight text-charcoal dark:text-white sm:text-2xl">
                  {displayName}
                </h1>
                {nickname.trim() && (
                  <p className="text-sm font-medium text-brand dark:text-brand-300">@{nickname.trim()}</p>
                )}
              </div>
            </div>

            {/* Info row */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {profile.email && (
                <span className="inline-flex items-center gap-1.5 text-xs text-charcoal-500 dark:text-charcoal-400">
                  <svg className="h-3.5 w-3.5 shrink-0 text-charcoal-400 dark:text-charcoal-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                  {profile.email}
                </span>
              )}
              {profile.student_id && (
                <span className="inline-flex items-center gap-1.5 text-xs text-charcoal-500 dark:text-charcoal-400">
                  <svg className="h-3.5 w-3.5 shrink-0 text-charcoal-400 dark:text-charcoal-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" />
                  </svg>
                  {profile.student_id}
                </span>
              )}
              {profile.major && (
                <span className="inline-flex items-center gap-1.5 text-xs text-charcoal-500 dark:text-charcoal-400">
                  <svg className="h-3.5 w-3.5 shrink-0 text-charcoal-400 dark:text-charcoal-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                  </svg>
                  {profile.major}
                </span>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="mt-4 text-sm leading-relaxed text-charcoal-600 dark:text-charcoal-300">
                {profile.bio}
              </p>
            )}

            {/* Social links */}
            {socialLinks.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {socialLinks.map((item) => {
                  const meta = getSocialMeta(item.platform);
                  if (!meta) return null;
                  return (
                    <a
                      key={item.platform}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-charcoal-200 bg-charcoal-50 py-1.5 pl-2.5 pr-3.5 text-xs font-medium text-charcoal-700 transition-all hover:-translate-y-0.5 hover:border-brand hover:bg-brand-50 hover:text-brand hover:shadow-md hover:shadow-brand/10 dark:border-charcoal-600 dark:bg-charcoal-700/60 dark:text-charcoal-200 dark:hover:border-brand-500 dark:hover:bg-brand-900/30 dark:hover:text-brand-300"
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-charcoal-700">
                        <SocialPlatformIcon platform={item.platform} className="h-3.5 w-3.5" />
                      </span>
                      {meta.label}
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Divider + Skills & Hobbies */}
          {(skills.length > 0 || hobbies.length > 0) && (
            <div className="border-t border-charcoal-100 px-4 py-5 dark:border-charcoal-700/60 sm:px-6">
              <div className="space-y-4">
                {skills.length > 0 && (
                  <div>
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
              </div>
            </div>
          )}

          {/* Empty state */}
          {!hasDetails && (
            <div className="border-t border-charcoal-100 px-4 py-8 text-center dark:border-charcoal-700/60 sm:px-6">
              <p className="text-xs text-charcoal-400 dark:text-charcoal-500">
                This student hasn&apos;t added more details yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

