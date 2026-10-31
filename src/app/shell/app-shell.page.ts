import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle,
  IonRouterOutlet,
  IonSplitPane,
} from '@ionic/angular';
import { SupabaseService } from '../services/supabase.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    IonButton,
    IonContent,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonMenu,
    IonMenuToggle,
    IonRouterOutlet,
    IonSplitPane,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './app-shell.page.html',
  styleUrl: './app-shell.page.scss',
})
export class AppShellPage {
  readonly auth = inject(SupabaseService);
  readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  readonly signOutError = signal('');

  async signOut(): Promise<void> {
    this.signOutError.set('');
    try {
      await this.auth.signOut();
      await this.router.navigateByUrl('/login');
    } catch (error: unknown) {
      this.signOutError.set(
        error instanceof Error ? error.message : 'No se pudo cerrar la sesión.',
      );
    }
  }
}
