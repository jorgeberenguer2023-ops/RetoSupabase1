export type AppRole = 'admin' | 'user';

export interface AppProfile {
  id: string;
  full_name: string;
  role: AppRole;
  community_id: number | null;
}

export interface Community {
  id: number;
  created_at: string;
  comunidad: string;
  numero: number;
  email: string;
  coste_mensual: number;
  junta: string;
  cancelada: boolean;
  user_id?: string | null;
  portal_image_path?: string | null;
  portal_image_url?: string | null;
}

export type NewCommunity = Omit<Community, 'id' | 'created_at' | 'portal_image_url'>;
