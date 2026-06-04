export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      celulares: {
        Row: {
          eliminado: boolean
          estado: string
          fecha_actualizacion: string
          fecha_compra: string
          fecha_creacion: string
          fecha_eliminacion: string | null
          fecha_venta: string | null
          id: string
          imagenes: string[]
          imei: string | null
          marca: string
          modelo: string
          observaciones: string | null
          precio_compra: number
          precio_venta: number
          problemas: string | null
          user_id: string
          vendido: boolean
        }
        Insert: {
          eliminado?: boolean
          estado?: string
          fecha_actualizacion?: string
          fecha_compra?: string
          fecha_creacion?: string
          fecha_eliminacion?: string | null
          fecha_venta?: string | null
          id?: string
          imagenes?: string[]
          imei?: string | null
          marca: string
          modelo: string
          observaciones?: string | null
          precio_compra?: number
          precio_venta?: number
          problemas?: string | null
          user_id: string
          vendido?: boolean
        }
        Update: {
          eliminado?: boolean
          estado?: string
          fecha_actualizacion?: string
          fecha_compra?: string
          fecha_creacion?: string
          fecha_eliminacion?: string | null
          fecha_venta?: string | null
          id?: string
          imagenes?: string[]
          imei?: string | null
          marca?: string
          modelo?: string
          observaciones?: string | null
          precio_compra?: number
          precio_venta?: number
          problemas?: string | null
          user_id?: string
          vendido?: boolean
        }
        Relationships: []
      }
      celulares_historial: {
        Row: {
          accion: string
          celular_id: string
          diff: Json | null
          fecha: string
          id: string
          user_id: string | null
        }
        Insert: {
          accion: string
          celular_id: string
          diff?: Json | null
          fecha?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          accion?: string
          celular_id?: string
          diff?: Json | null
          fecha?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      repuestos: {
        Row: {
          categoria: Database["public"]["Enums"]["repuesto_categoria"]
          eliminado: boolean
          fecha_actualizacion: string
          fecha_creacion: string
          fecha_eliminacion: string | null
          id: string
          marca: string
          modelo_compatible: string
          observaciones: string | null
          precio_compra: number
          precio_venta: number
          stock: number
          user_id: string
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["repuesto_categoria"]
          eliminado?: boolean
          fecha_actualizacion?: string
          fecha_creacion?: string
          fecha_eliminacion?: string | null
          id?: string
          marca?: string
          modelo_compatible?: string
          observaciones?: string | null
          precio_compra?: number
          precio_venta?: number
          stock?: number
          user_id: string
        }
        Update: {
          categoria?: Database["public"]["Enums"]["repuesto_categoria"]
          eliminado?: boolean
          fecha_actualizacion?: string
          fecha_creacion?: string
          fecha_eliminacion?: string | null
          id?: string
          marca?: string
          modelo_compatible?: string
          observaciones?: string | null
          precio_compra?: number
          precio_venta?: number
          stock?: number
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "empleado"
      repuesto_categoria:
        | "modulo"
        | "placa_carga"
        | "bateria"
        | "porta_sim"
        | "flex"
        | "camara"
        | "tapa"
        | "placa_main"
        | "otro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "empleado"],
      repuesto_categoria: [
        "modulo",
        "placa_carga",
        "bateria",
        "porta_sim",
        "flex",
        "camara",
        "tapa",
        "placa_main",
        "otro",
      ],
    },
  },
} as const
