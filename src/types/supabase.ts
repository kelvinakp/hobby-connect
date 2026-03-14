export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          student_id: string | null;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          bio: string | null;
          major: string | null;
          avatar_url: string | null;
          role: string;
          is_banned: boolean;
          onboarding_complete: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          student_id?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          bio?: string | null;
          major?: string | null;
          avatar_url?: string | null;
          role?: string;
          is_banned?: boolean;
          onboarding_complete?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          bio?: string | null;
          major?: string | null;
          avatar_url?: string | null;
          role?: string;
          is_banned?: boolean;
          onboarding_complete?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      profile_hobbies: {
        Row: {
          id: string;
          user_id: string;
          hobby_name: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          hobby_name: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          hobby_name?: string;
        };
        Relationships: [];
      };

      messages: {
        Row: {
          id: string;
          community_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          community_id: string;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          community_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      hobbies: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          category: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          category?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          category?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      interests: {
        Row: {
          id: string;
          hobby_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          hobby_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          hobby_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      events: {
        Row: {
          id: string;
          community_id: string;
          creator_id: string;
          title: string;
          location: string;
          event_date: string;
          capacity: number;
          required_skill: "beginner" | "intermediate" | "advanced";
          status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "COMPLETED";
          created_at: string;
        };
        Insert: {
          id?: string;
          community_id: string;
          creator_id: string;
          title: string;
          location: string;
          event_date: string;
          capacity: number;
          required_skill?: "beginner" | "intermediate" | "advanced";
          status?: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "COMPLETED";
          created_at?: string;
        };
        Update: {
          id?: string;
          community_id?: string;
          creator_id?: string;
          title?: string;
          location?: string;
          event_date?: string;
          capacity?: number;
          required_skill?: "beginner" | "intermediate" | "advanced";
          status?: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "COMPLETED";
          created_at?: string;
        };
        Relationships: [];
      };

      user_skills: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          skill_level: "noob" | "skilled" | "pro";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: string;
          skill_level: "noob" | "skilled" | "pro";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category?: string;
          skill_level?: "noob" | "skilled" | "pro";
          created_at?: string;
        };
        Relationships: [];
      };
    };

    Views: Record<string, never>;
    Functions: Record<string, never>;

    Enums: {
      event_status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "COMPLETED";
      group_role: "member" | "moderator" | "admin";
      skill_level: "noob" | "skilled" | "pro";
    };

    CompositeTypes: Record<string, never>;
  };
};

/* ─── Convenience helpers ─── */

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  T extends keyof PublicSchema["Tables"],
> = PublicSchema["Tables"][T]["Row"];

export type InsertDto<
  T extends keyof PublicSchema["Tables"],
> = PublicSchema["Tables"][T]["Insert"];

export type UpdateDto<
  T extends keyof PublicSchema["Tables"],
> = PublicSchema["Tables"][T]["Update"];

export type Enums<
  T extends keyof PublicSchema["Enums"],
> = PublicSchema["Enums"][T];
