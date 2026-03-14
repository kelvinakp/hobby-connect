"use client";

import Image from "next/image";
import { PRESET_AVATARS } from "@/lib/avatars";

interface Props {
  selected: string | null;
  onSelect: (url: string) => void;
}

export default function AvatarPicker({ selected, onSelect }: Props) {
  return (
    <div>
      <p className="mb-2.5 text-sm font-medium text-charcoal-600 dark:text-charcoal-200">
        Choose an Avatar
      </p>
      <div className="grid grid-cols-6 gap-2.5">
        {PRESET_AVATARS.map((url) => {
          const isActive = selected === url;
          return (
            <button
              key={url}
              type="button"
              onClick={() => onSelect(url)}
              className={`relative flex items-center justify-center rounded-xl p-1.5 transition-all ${
                isActive
                  ? "bg-brand-50 ring-2 ring-brand dark:bg-brand-900/30"
                  : "bg-charcoal-50 hover:bg-charcoal-100 dark:bg-charcoal-700 dark:hover:bg-charcoal-600"
              }`}
            >
              <Image
                src={url}
                alt="Avatar option"
                width={48}
                height={48}
                className="rounded-lg"
                unoptimized
              />
              {isActive && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-white">
                  <svg
                    className="h-2.5 w-2.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={3}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m4.5 12.75 6 6 9-13.5"
                    />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
