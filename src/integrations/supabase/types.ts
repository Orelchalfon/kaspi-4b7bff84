export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      child_profiles: {
        Row: {
          avatar: string | null;
          birthdate: string | null;
          created_at: string | null;
          current_balance: number | null;
          display_name: string;
          household_id: string;
          id: string;
          user_id: string;
        };
        Insert: {
          avatar?: string | null;
          birthdate?: string | null;
          created_at?: string | null;
          current_balance?: number | null;
          display_name: string;
          household_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          avatar?: string | null;
          birthdate?: string | null;
          created_at?: string | null;
          current_balance?: number | null;
          display_name?: string;
          household_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "child_profiles_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      goals: {
        Row: {
          child_id: string;
          created_at: string;
          created_by: string;
          cycle_amount: number;
          cycle_period: string;
          household_id: string;
          id: string;
          status: string;
          target_amount: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          child_id: string;
          created_at?: string;
          created_by: string;
          cycle_amount: number;
          cycle_period: string;
          household_id: string;
          id?: string;
          status?: string;
          target_amount: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          child_id?: string;
          created_at?: string;
          created_by?: string;
          cycle_amount?: number;
          cycle_period?: string;
          household_id?: string;
          id?: string;
          status?: string;
          target_amount?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goals_child_id_fkey";
            columns: ["child_id"];
            isOneToOne: false;
            referencedRelation: "child_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goals_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      household_settings: {
        Row: {
          created_at: string | null;
          household_id: string;
          id: string;
          quiz_reward_amount: number;
          quiz_subjects: string[];
          savings_percentage: number;
        };
        Insert: {
          created_at?: string | null;
          household_id: string;
          id?: string;
          quiz_reward_amount?: number;
          quiz_subjects?: string[];
          savings_percentage?: number;
        };
        Update: {
          created_at?: string | null;
          household_id?: string;
          id?: string;
          quiz_reward_amount?: number;
          quiz_subjects?: string[];
          savings_percentage?: number;
        };
        Relationships: [
          {
            foreignKeyName: "household_settings_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: true;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      households: {
        Row: {
          created_at: string | null;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      quiz_attempts: {
        Row: {
          child_id: string;
          correct: number;
          created_at: string;
          household_id: string;
          id: string;
          paid: boolean;
          passed: boolean;
          subject: string;
          total: number;
        };
        Insert: {
          child_id: string;
          correct: number;
          created_at?: string;
          household_id: string;
          id?: string;
          paid?: boolean;
          passed: boolean;
          subject: string;
          total: number;
        };
        Update: {
          child_id?: string;
          correct?: number;
          created_at?: string;
          household_id?: string;
          id?: string;
          paid?: boolean;
          passed?: boolean;
          subject?: string;
          total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_child_id_fkey";
            columns: ["child_id"];
            isOneToOne: false;
            referencedRelation: "child_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_attempts_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          child_id: string;
          created_at: string | null;
          created_by_parent_id: string;
          description: string | null;
          household_id: string;
          id: string;
          reviewed_at: string | null;
          reward_amount: number;
          status: string;
          submitted_at: string | null;
          title: string;
        };
        Insert: {
          child_id: string;
          created_at?: string | null;
          created_by_parent_id: string;
          description?: string | null;
          household_id: string;
          id?: string;
          reviewed_at?: string | null;
          reward_amount: number;
          status?: string;
          submitted_at?: string | null;
          title: string;
        };
        Update: {
          child_id?: string;
          created_at?: string | null;
          created_by_parent_id?: string;
          description?: string | null;
          household_id?: string;
          id?: string;
          reviewed_at?: string | null;
          reward_amount?: number;
          status?: string;
          submitted_at?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_child_id_fkey";
            columns: ["child_id"];
            isOneToOne: false;
            referencedRelation: "child_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          amount: number;
          child_id: string;
          created_at: string | null;
          goal_id: string | null;
          household_id: string;
          id: string;
          reference_quiz_attempt_id: string | null;
          reference_task_id: string | null;
          type: string;
        };
        Insert: {
          amount: number;
          child_id: string;
          created_at?: string | null;
          goal_id?: string | null;
          household_id: string;
          id?: string;
          reference_quiz_attempt_id?: string | null;
          reference_task_id?: string | null;
          type: string;
        };
        Update: {
          amount?: number;
          child_id?: string;
          created_at?: string | null;
          goal_id?: string | null;
          household_id?: string;
          id?: string;
          reference_quiz_attempt_id?: string | null;
          reference_task_id?: string | null;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_child_id_fkey";
            columns: ["child_id"];
            isOneToOne: false;
            referencedRelation: "child_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_reference_quiz_attempt_id_fkey";
            columns: ["reference_quiz_attempt_id"];
            isOneToOne: false;
            referencedRelation: "quiz_attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_reference_task_id_fkey";
            columns: ["reference_task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string | null;
          household_id: string;
          id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          household_id: string;
          id?: string;
          role: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          household_id?: string;
          id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      approve_task_and_pay: { Args: { p_task_id: string }; Returns: boolean };
      complete_quiz_and_pay: {
        Args: { _correct: number; _subject: string; _total: number };
        Returns: Json;
      };
      deposit_savings_to_goal: {
        Args: { _amount: number; _goal_id: string };
        Returns: Json;
      };
      deposit_to_goal: {
        Args: { _amount: number; _goal_id: string };
        Returns: Json;
      };
      deposit_to_savings: { Args: { _amount: number }; Returns: Json };
      set_child_avatar: {
        Args: { _avatar: string; _child_id: string };
        Returns: Json;
      };
      set_child_birthdate: {
        Args: { _birthdate: string; _child_id: string };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
