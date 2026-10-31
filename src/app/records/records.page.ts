import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AlertController, ToastController } from '@ionic/angular';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonMenuButton,
  IonModal,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular';
import { Community, NewCommunity } from '../models/record.model';
import { RecordTableComponent } from '../components/record-table/record-table.component';
import { CommunitiesService } from '../services/communities.service';
import { ReportService } from '../services/report.service';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-records',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonMenuButton,
    IonModal,
    IonTitle,
    IonToggle,
    IonToolbar,
    RecordTableComponent,
  ],
  templateUrl: './records.page.html',
  styleUrl: './records.page.scss',
})
export class RecordsPage implements OnInit {
  readonly communitiesService = inject(CommunitiesService);
  readonly auth = inject(SupabaseService);
  readonly reports = inject(ReportService);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);
  readonly currentCommunity = computed(() => {
    const communityId = this.auth.profile()?.community_id;
    return this.communitiesService.communities().find((community) => community.id === communityId) ?? null;
  });
  readonly error = signal('');
  readonly emailValidationError = signal('');
  readonly editorOpen = signal(false);
  readonly saving = signal(false);
  readonly selectedPhoto = signal<File | null>(null);
  readonly photoPreview = signal<string | null>(null);
  readonly isAdmin = () => this.auth.profile()?.role === 'admin';
  editingId: number | null = null;
  draft: NewCommunity = this.emptyDraft();

  async ngOnInit(): Promise<void> {
    try {
      await this.communitiesService.load();
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error ? error.message : 'No se pudieron cargar las comunidades.',
      );
    }
  }

  async downloadCsv(): Promise<void> {
    this.error.set('');
    try {
      await this.reports.downloadCsv(this.communitiesService.communities());
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo exportar el CSV.');
    }
  }

  async downloadPdf(): Promise<void> {
    this.error.set('');
    try {
      await this.reports.downloadPdf(this.communitiesService.communities());
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo exportar el PDF.');
    }
  }

  openNewCommunity(): void {
    this.editingId = null;
    this.selectedPhoto.set(null);
    this.photoPreview.set(null);
    this.draft = this.emptyDraft();
    this.editorOpen.set(true);
  }

  editCommunity(community: Community): void {
    this.editingId = community.id;
    this.draft = {
      comunidad: community.comunidad,
      numero: community.numero,
      email: community.email,
      coste_mensual: community.coste_mensual,
      junta: community.junta,
      cancelada: community.cancelada,
      portal_image_path: community.portal_image_path ?? null,
    };
    this.selectedPhoto.set(null);
    this.photoPreview.set(null);
    this.editorOpen.set(true);
  }

  closeEditor(): void {
    this.editorOpen.set(false);
    this.error.set('');
    this.emailValidationError.set('');
    this.selectedPhoto.set(null);
    this.photoPreview.set(null);
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedPhoto.set(file);
    this.photoPreview.set(file ? URL.createObjectURL(file) : null);
  }

  async uploadSelectedPhoto(): Promise<void> {
    if (this.editingId === null || !this.selectedPhoto() || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    try {
      await this.communitiesService.uploadPortalPhoto(this.editingId, this.selectedPhoto()!);
      this.draft.portal_image_path = this.communitiesService.communities().find((item) => item.id === this.editingId)?.portal_image_path ?? null;
      this.selectedPhoto.set(null);
      this.photoPreview.set(null);
      await this.showToast('Fotografía del portal guardada.');
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo subir la fotografía.');
    } finally {
      this.saving.set(false);
    }
  }

  async deletePortalPhoto(): Promise<void> {
    if (this.editingId === null || this.saving()) return;
    this.saving.set(true);
    try {
      await this.communitiesService.removePortalPhoto(this.editingId);
      this.draft.portal_image_path = null;
      await this.showToast('Fotografía eliminada.');
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo eliminar la fotografía.');
    } finally {
      this.saving.set(false);
    }
  }

  async save(form: NgForm): Promise<void> {
    if (form.invalid || this.saving()) {
      return;
    }
    this.error.set('');
    this.emailValidationError.set('');
    this.saving.set(true);
    const community = {
      ...this.draft,
      comunidad: this.draft.comunidad.trim(),
      email: this.draft.email.trim(),
      numero: Number(this.draft.numero),
      coste_mensual: Number(this.draft.coste_mensual),
      junta: this.draft.junta,
      cancelada: Boolean(this.draft.cancelada),
    };

    try {
      if (await this.communitiesService.emailExists(community.email, this.editingId)) {
        this.emailValidationError.set('Ese correo ya está asociado a otra comunidad.');
        return;
      }
      if (this.editingId !== null) {
        await this.communitiesService.update(this.editingId, community);
      } else {
        await this.communitiesService.create(community);
      }
      this.editorOpen.set(false);
      await this.showToast(this.editingId !== null ? 'Comunidad actualizada.' : 'Comunidad creada.');
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error ? error.message : 'No se pudo guardar la comunidad.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  async validateEmail(): Promise<void> {
    const email = this.draft.email.trim();
    const editingId = this.editingId;
    this.emailValidationError.set('');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return;
    }
    try {
      const exists = await this.communitiesService.emailExists(email, editingId);
      if (this.draft.email.trim() !== email || this.editingId !== editingId) {
        return;
      }
      if (exists) {
        this.emailValidationError.set('Ese correo ya está asociado a otra comunidad.');
      }
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error ? error.message : 'No se pudo validar el correo.',
      );
    }
  }

  async confirmDelete(community: Community): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Eliminar comunidad',
      message: `¿Quieres eliminar el registro de "${community.comunidad}"? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'destructive') {
      return;
    }

    this.error.set('');
    try {
      await this.communitiesService.remove(community.id);
      await this.showToast('Comunidad eliminada.');
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error ? error.message : 'No se pudo eliminar la comunidad.',
      );
    }
  }


  async syncCommunityUsers(): Promise<void> {
    this.error.set('');
    this.saving.set(true);
    try {
      for (const community of this.communitiesService.communities()) {
        await this.communitiesService.provisionCommunityUser(community.id, community.email, community.comunidad);
      }
      await this.communitiesService.load();
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'No se pudieron sincronizar los accesos.');
    } finally {
      this.saving.set(false);
    }
  }

  private emptyDraft(): NewCommunity {
    return {
      comunidad: '',
      numero: 1,
      email: '',
      coste_mensual: 0,
      junta: new Date().toISOString().slice(0, 10),
      cancelada: false,
      portal_image_path: null,
    };
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2200,
      position: 'bottom',
      color: 'success',
    });
    await toast.present();
  }
}
