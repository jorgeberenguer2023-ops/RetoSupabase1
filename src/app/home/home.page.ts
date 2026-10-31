import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import Chart, { ChartConfiguration } from 'chart.js/auto';
import { Community } from '../models/record.model';
import { CommunitiesService } from '../services/communities.service';
import { ReportService } from '../services/report.service';
import { SupabaseService } from '../services/supabase.service';
import { ThemeService } from '../services/theme.service';
import { RecordTableComponent } from '../components/record-table/record-table.component';
import { StatCardComponent } from '../components/stat-card/stat-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [
    CurrencyPipe,
    DatePipe,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonMenuButton,
    IonTitle,
    IonToolbar,
    RecordTableComponent,
    StatCardComponent,
  ],
})
export class HomePage implements AfterViewInit, OnDestroy {
  @ViewChild('communityChart') private chartCanvas?: ElementRef<HTMLCanvasElement>;

  readonly communitiesService = inject(CommunitiesService);
  readonly auth = inject(SupabaseService);
  readonly reports = inject(ReportService);
  readonly theme = inject(ThemeService);
  readonly error = signal('');
  readonly currentDate = new Date();
  private chart?: Chart;

  constructor() {
    effect(() => {
      this.communitiesService.communities();
      this.theme.dark();
      if (this.chartCanvas) {
        this.renderChart();
      }
    });
  }

  get communities(): Community[] {
    return this.communitiesService.communities();
  }

  get monthlyIncome(): number {
    return this.communities
      .filter((community) => !community.cancelada)
      .reduce((sum, community) => sum + community.coste_mensual, 0);
  }

  get activeCount(): number {
    return this.communities.filter((community) => !community.cancelada).length;
  }

  get cancelledCount(): number {
    return this.communities.filter((community) => community.cancelada).length;
  }

  get nextMeeting(): Community | undefined {
    const now = new Date();
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');
    return this.communities
      .filter((community) => !community.cancelada && community.junta >= today)
      .sort((a, b) => a.junta.localeCompare(b.junta))[0];
  }

  async ngAfterViewInit(): Promise<void> {
    try {
      await this.communitiesService.load();
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error ? error.message : 'No se pudieron cargar las comunidades.',
      );
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  async downloadCsv(): Promise<void> {
    this.error.set('');
    try {
      await this.reports.downloadCsv(this.communities);
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo exportar el CSV.');
    }
  }

  async downloadPdf(): Promise<void> {
    this.error.set('');
    try {
      await this.reports.downloadPdf(this.communities);
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo exportar el PDF.');
    }
  }

  private renderChart(): void {
    const canvas = this.chartCanvas?.nativeElement;
    if (!canvas) {
      return;
    }
    this.chart?.destroy();
    const tickColor = this.theme.dark() ? '#aab8ae' : '#526477';
    const gridColor = this.theme.dark() ? '#2b3a32' : '#e5e9e3';
    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: this.communities.map((community) => community.comunidad),
        datasets: [
          {
            label: 'Cuota mensual (€)',
            data: this.communities.map((community) => community.coste_mensual),
            backgroundColor: '#4d7651',
            borderRadius: 6,
            maxBarThickness: 44,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: tickColor } },
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: { precision: 0, color: tickColor },
          },
        },
      },
    };
    this.chart = new Chart(canvas, config);
  }
}
