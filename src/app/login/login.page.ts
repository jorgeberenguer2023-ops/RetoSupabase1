import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonSpinner,
} from '@ionic/angular';
import { SupabaseService } from '../services/supabase.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, IonButton, IonContent, IonIcon, IonInput, IonSpinner, RouterLink],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  readonly auth = inject(SupabaseService);
  readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  email = '';
  password = '';
  readonly error = signal('');
  readonly submitting = signal(false);
  readonly passwordVisible = signal(false);

  async submit(): Promise<void> {
    this.error.set('');
    this.submitting.set(true);
    try {
      await this.auth.signIn(this.email.trim(), this.password);
      await this.router.navigateByUrl(
        this.auth.profile()?.role === 'admin' ? '/dashboard' : '/records',
      );
    } catch (error: unknown) {
      this.error.set(this.auth.describeError(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
