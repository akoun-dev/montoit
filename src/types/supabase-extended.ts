// Types temporaires pour les nouvelles tables en attendant la régénération Supabase
export interface UserPreferences {
  id: string;
  user_id: string;
  dashboard_layout: any;
  enabled_widgets: string[];
  created_at: string;
  updated_at: string;
}

export interface FormDraft {
  id: string;
  user_id: string;
  form_type: string;
  draft_data: any;
  created_at: string;
  updated_at: string;
}

export interface HelpInteraction {
  id: string;
  user_id: string;
  help_type: string;
  content_id: string;
  created_at: string;
}
