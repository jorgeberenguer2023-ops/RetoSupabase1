import { Injectable, inject, signal } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Community, NewCommunity } from '../models/record.model';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class CommunitiesService {
  private readonly supabase = inject(SupabaseService);
  readonly communities = signal<Community[]>([]);
  readonly realtimeError = signal('');
  readonly realtimeConnected = signal(false);
  private channel?: RealtimeChannel;

  async load(): Promise<void> {
    const client = await this.supabase.getClient();
    const { data, error } = await client
      .from('comunidad')
      .select('id, created_at, comunidad, numero, email, coste_mensual, junta, cancelada, user_id, portal_image_path')
      .order('created_at', { ascending: false });
    if (error) {
      throw error;
    }
    const communities = await Promise.all((data as Community[]).map(async (community) => {
      let portalImageUrl: string | null = null;
      if (community.portal_image_path) {
        const { data: signedImage } = await client.storage
          .from('community-photos')
          .createSignedUrl(community.portal_image_path, 60 * 60);
        portalImageUrl = signedImage?.signedUrl ?? null;
      }
      return { ...community, portal_image_url: portalImageUrl };
    }));
    this.communities.set(communities);
    await this.subscribeToChanges();
  }

  async create(community: NewCommunity): Promise<void> {
    const client = await this.supabase.getClient();
    const { data, error } = await client.from('comunidad').insert(community).select('id, email, comunidad').single();
    if (error) throw error;
    if (data?.id && data?.email) {
      await this.provisionCommunityUser(data.id, data.email, data.comunidad);
    }
    await this.load();
  }

  async update(id: number, community: NewCommunity): Promise<void> {
    const client = await this.supabase.getClient();
    const { error } = await client.from('comunidad').update(community).eq('id', id);
    if (error) throw error;
    await this.provisionCommunityUser(id, community.email, community.comunidad);
    await this.load();
  }


  async uploadPortalPhoto(communityId: number, file: File): Promise<void> {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Formato no válido. Utiliza una imagen JPG, PNG o WEBP.');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('La imagen supera los 5 MB permitidos.');
    }

    const client = await this.supabase.getClient();
    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${communityId}/portal-${Date.now()}.${extension}`;
    const { data: current, error: readError } = await client
      .from('comunidad').select('portal_image_path').eq('id', communityId).single();
    if (readError) throw readError;

    const { error: uploadError } = await client.storage
      .from('community-photos')
      .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' });
    if (uploadError) throw uploadError;

    const { error: updateError } = await client
      .from('comunidad').update({ portal_image_path: path }).eq('id', communityId);
    if (updateError) {
      await client.storage.from('community-photos').remove([path]);
      throw updateError;
    }

    const previousPath = (current as { portal_image_path?: string | null } | null)?.portal_image_path;
    if (previousPath && previousPath !== path) {
      await client.storage.from('community-photos').remove([previousPath]);
    }
    await this.load();
  }

  async removePortalPhoto(communityId: number): Promise<void> {
    const client = await this.supabase.getClient();
    const { data, error } = await client
      .from('comunidad').select('portal_image_path').eq('id', communityId).single();
    if (error) throw error;
    const path = (data as { portal_image_path?: string | null }).portal_image_path;
    const { error: updateError } = await client
      .from('comunidad').update({ portal_image_path: null }).eq('id', communityId);
    if (updateError) throw updateError;
    if (path) {
      const { error: removeError } = await client.storage.from('community-photos').remove([path]);
      if (removeError) throw removeError;
    }
    await this.load();
  }

  async provisionCommunityUser(communityId: number, email: string, fullName = ''): Promise<void> {
    const client = await this.supabase.getClient();
    const { error } = await client.functions.invoke('create-community-user', {
      body: { communityId, email: email.trim(), fullName: fullName.trim() },
    });
    if (error) {
      throw new Error(`La comunidad se guardó, pero no se pudo crear su acceso: ${error.message}. Despliega la Edge Function create-community-user.`);
    }
  }

  async remove(id: number): Promise<void> {
    const client = await this.supabase.getClient();
    const { error } = await client.from('comunidad').delete().eq('id', id);
    if (error) {
      throw error;
    }
    await this.load();
  }

  async emailExists(email: string, excludeId: number | null): Promise<boolean> {
    const client = await this.supabase.getClient();
    let query = client.from('comunidad').select('id').ilike('email', email);
    if (excludeId !== null) {
      query = query.neq('id', excludeId);
    }
    const { data, error } = await query.limit(1);
    if (error) {
      throw error;
    }
    return data.length > 0;
  }

  private async subscribeToChanges(): Promise<void> {
    if (this.channel) {
      return;
    }
    const client = await this.supabase.getClient();
    this.channel = client
      .channel('comunidad-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comunidad' }, () => {
        void this.load().catch((error: unknown) => {
          this.realtimeError.set(
            error instanceof Error ? error.message : 'No se pudieron actualizar las comunidades.',
          );
        });
      })
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.realtimeConnected.set(false);
          this.realtimeError.set(
            error?.message ?? 'No se pudo establecer la conexión en tiempo real.',
          );
        } else if (status === 'SUBSCRIBED') {
          this.realtimeConnected.set(true);
          this.realtimeError.set('');
        } else if (status === 'CLOSED') {
          this.realtimeConnected.set(false);
        }
      });
  }
}
