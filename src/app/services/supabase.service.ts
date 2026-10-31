import { Injectable, signal } from '@angular/core';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { AppProfile } from '../models/record.model';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly client: SupabaseClient | null =
    environment.supabaseUrl && environment.supabaseKey
      ? createClient(environment.supabaseUrl, environment.supabaseKey)
      : null;
  private initialization?: Promise<void>;

  readonly session = signal<Session | null>(null);
  readonly profile = signal<AppProfile | null>(null);
  readonly initialized = signal(false);
  readonly authError = signal('');
  private readonly profileLoads = new Map<string, Promise<AppProfile>>();

  get isConfigured(): boolean {
    return this.client !== null;
  }

  async initialize(): Promise<void> {
    if (!this.initialization) {
      this.initialization = this.initializeAuth();
    }
    return this.initialization;
  }

  async getClient(): Promise<SupabaseClient> {
    if (!this.client) {
      throw new Error(
        'Supabase no está configurado. Añade la URL y la clave publicable en src/environments/environment.ts.',
      );
    }
    return this.client;
  }

  private async initializeAuth(): Promise<void> {
    if (!this.client) {
      this.initialized.set(true);
      return;
    }

    const { data, error } = await this.client.auth.getSession();
    if (error) {
      this.authError.set(this.describeError(error));
    } else {
      try {
        await this.applySession(data.session);
      } catch (profileError: unknown) {
        this.authError.set(this.describeError(profileError));
      }
    }
    this.client.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
      if (!session) {
        this.profile.set(null);
        this.authError.set('');
        return;
      }
      if (this.profile()?.id === session.user.id) {
        return;
      }

      this.profile.set(null);
      queueMicrotask(() => {
        if (this.session()?.user.id !== session.user.id || this.profile()?.id === session.user.id) {
          return;
        }
        void this.loadProfile(session.user.id).catch((error: unknown) => {
          this.authError.set(this.describeError(error));
        });
      });
    });
    this.initialized.set(true);
  }

  async signIn(email: string, password: string): Promise<void> {
    const client = await this.getClient();
    this.authError.set('');
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
    try {
      await this.applySession(data.session);
    } catch (error: unknown) {
      const message = this.describeError(error);
      this.authError.set(message);
      throw new Error(message);
    }
  }

  async signOut(): Promise<void> {
    const client = await this.getClient();
    const { error } = await client.auth.signOut();
    if (error) {
      throw error;
    }
    this.session.set(null);
    this.profile.set(null);
  }

  private loadProfile(userId: string): Promise<AppProfile> {
    const pending = this.profileLoads.get(userId);
    if (pending) {
      return pending;
    }
    const request = this.fetchProfile(userId).finally(() => {
      this.profileLoads.delete(userId);
    });
    this.profileLoads.set(userId, request);
    return request;
  }

  private async fetchProfile(userId: string): Promise<AppProfile> {
    const client = await this.getClient();
    const { data, error } = await client
      .from('profiles')
      .select('id, full_name, role, community_id')
      .eq('id', userId)
      .single();
    if (error) {
      throw error;
    }
    const profile = data as AppProfile;
    if (profile.role !== 'admin' && profile.role !== 'user') {
      throw new Error('El perfil no tiene un rol válido.');
    }
    this.profile.set(profile);
    return profile;
  }

  private async applySession(session: Session | null): Promise<void> {
    this.session.set(session);
    this.profile.set(null);
    this.authError.set('');
    if (session?.user) {
      await this.loadProfile(session.user.id);
    }
  }

  describeError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = String(error.code);
      if (code === 'PGRST205') {
        return 'Supabase ha aceptado el inicio de sesión, pero falta la tabla public.profiles. Ejecuta en el SQL Editor la migración supabase/migrations/20261027000000_initial_schema.sql y vuelve a entrar.';
      }
      if (code === 'PGRST116') {
        return 'La cuenta existe, pero todavía no tiene perfil. Ejecuta la migración supabase/migrations/20261027000000_initial_schema.sql para crear los perfiles existentes y vuelve a entrar.';
      }
      if (code === '42501') {
        return 'No hay permisos para leer el perfil. Ejecuta la migración supabase/migrations/20261027000000_initial_schema.sql en el proyecto Supabase.';
      }
      if ('message' in error && typeof error.message === 'string') {
        return error.message;
      }
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'No se pudo cargar el perfil de usuario.';
  }
}
