import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import {
  IonButton,
  IonIcon,
  IonInput,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular';
import { Community } from '../../models/record.model';

registerLocaleData(localeEs);

@Component({
  selector: 'app-community-table',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, IonButton, IonIcon, IonInput, IonSelect, IonSelectOption],
  templateUrl: './record-table.component.html',
  styleUrl: './record-table.component.scss',
})
export class RecordTableComponent {
  @Input() communities: Community[] = [];
  @Input() canManage = false;
  @Output() edit = new EventEmitter<Community>();
  @Output() remove = new EventEmitter<Community>();

  readonly searchTerm = signal('');
  readonly cancellationFilter = signal('all');

  get filteredCommunities(): Community[] {
    const term = this.searchTerm().trim().toLocaleLowerCase();
    return this.communities.filter((community) => {
      const matchesTerm =
        !term ||
        community.comunidad.toLocaleLowerCase().includes(term) ||
        community.email.toLocaleLowerCase().includes(term);
      const matchesCancellation =
        this.cancellationFilter() === 'all' ||
        String(community.cancelada) === this.cancellationFilter();
      return matchesTerm && matchesCancellation;
    });
  }
}
