import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly dark = signal(localStorage.getItem('nexo-theme') === 'dark');

  constructor() { this.apply(this.dark()); }

  toggle(): void { this.dark.update((value) => { const next = !value; this.apply(next); return next; }); }

  private apply(dark: boolean): void {
    document.documentElement.classList.toggle('dark-theme', dark);
    localStorage.setItem('nexo-theme', dark ? 'dark' : 'light');
  }
}
