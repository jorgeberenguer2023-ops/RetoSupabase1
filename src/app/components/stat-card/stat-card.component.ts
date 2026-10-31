import { Component, Input } from '@angular/core';
import { IonIcon } from '@ionic/angular';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [IonIcon],
  template: `
    <article class="stat-card">
      <div class="stat-card__top">
        <span>{{ label }}</span>
        <ion-icon [name]="icon" aria-hidden="true"></ion-icon>
      </div>
      <strong>{{ value }}</strong>
      <small>{{ detail }}</small>
    </article>
  `,
  styleUrl: './stat-card.component.scss',
})
export class StatCardComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value: string | number | null = '';
  @Input() detail = '';
  @Input() icon = 'stats-chart-outline';
}
