"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface TestResult {
  status: "loading" | "success" | "error";
  message: string;
  data?: unknown[];
}

export default function SupabaseTest() {
  const [result, setResult] = useState<TestResult>({
    status: "loading",
    message: "Connecting to Supabase…",
  });

  useEffect(() => {
    async function fetchHobbies() {
      const supabase = createClient();
      const { data, error } = await supabase.from("hobbies").select("*");

      if (error) {
        console.error("[Supabase Test] Query failed:", error.message);
        setResult({ status: "error", message: error.message });
      } else {
        console.log("[Supabase Test] Connection OK — rows returned:", data);
        setResult({
          status: "success",
          message: `Connected! ${data.length} hobby(ies) found.`,
          data,
        });
      }
    }

    fetchHobbies();
  }, []);

  return (
    <div
      className={`mt-8 rounded-lg border px-4 py-3 text-sm ${
        result.status === "loading"
          ? "border-charcoal-200 bg-charcoal-50 text-charcoal-500 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-charcoal-300"
          : result.status === "success"
            ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300"
            : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
      }`}
    >
      <span className="font-medium">Supabase: </span>
      {result.message}
    </div>
  );
}
