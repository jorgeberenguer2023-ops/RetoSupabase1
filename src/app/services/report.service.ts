import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { jsPDF } from 'jspdf';
import { Community } from '../models/record.model';

@Injectable({ providedIn: 'root' })
export class ReportService {
  async downloadCsv(communities: Community[]): Promise<void> {
    const header = ['Comunidad', 'Número', 'Correo', 'Cuota mensual', 'Junta', 'Estado'];
    const rows = communities.map((community) => [
      community.comunidad,
      String(community.numero),
      community.email,
      community.coste_mensual.toFixed(2),
      new Date(`${community.junta}T00:00:00`).toLocaleDateString('es-ES'),
      community.cancelada ? 'Cancelada' : 'Activa',
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((field) => {
            const safeField = /^[\t\r ]*[=+\-@]/.test(field) ? `'${field}` : field;
            return `"${safeField.replaceAll('"', '""')}"`;
          })
          .join(';'),
      )
      .join('\r\n');
    const name = `comunidades-${this.dateStamp()}.csv`;
    const content = `\uFEFF${csv}`;
    if (Capacitor.isNativePlatform()) {
      await this.shareFile(name, this.toBase64(content), 'text/csv');
      return;
    }
    this.downloadFile(name, content, 'text/csv;charset=utf-8');
  }

  async downloadPdf(communities: Community[]): Promise<void> {
    const document = new jsPDF();
    document.setFontSize(18);
    document.text('Nexo - Informe de comunidades', 14, 18);
    document.setFontSize(10);
    document.text(`Generado el ${new Date().toLocaleDateString('es-ES')}`, 14, 25);

    const columns = ['Comunidad', 'Número', 'Correo', 'Cuota', 'Junta', 'Estado'];
    const widths = [40, 20, 52, 28, 27, 24];
    let y = 36;
    document.setFont('helvetica', 'bold');
    columns.forEach((column, index) => {
      document.text(column, 14 + widths.slice(0, index).reduce((a, b) => a + b, 0), y);
    });
    document.setFont('helvetica', 'normal');

    for (const [index, community] of communities.entries()) {
      y += 8;
      if (y > 278) {
        document.addPage();
        y = 18;
      }
      const values = [
        community.comunidad.slice(0, 20),
        String(community.numero),
        community.email.slice(0, 27),
        `${community.coste_mensual.toFixed(2)} EUR`,
        new Date(`${community.junta}T00:00:00`).toLocaleDateString('es-ES'),
        community.cancelada ? 'Cancelada' : 'Activa',
      ];
      values.forEach((value, valueIndex) => {
        const x = 14 + widths.slice(0, valueIndex).reduce((a, b) => a + b, 0);
        document.text(value, x, y);
      });
      if (index < communities.length - 1) {
        document.setDrawColor(224, 230, 235);
        document.line(14, y + 3, 197, y + 3);
      }
    }
    const name = `comunidades-${this.dateStamp()}.pdf`;
    if (Capacitor.isNativePlatform()) {
      const base64 = document.output('datauristring').split(',')[1];
      await this.shareFile(name, base64, 'application/pdf');
      return;
    }
    document.save(name);
  }

  private dateStamp(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private downloadFile(name: string, content: string, type: string): void {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private async shareFile(name: string, data: string, mimeType: string): Promise<void> {
    const { uri } = await Filesystem.writeFile({
      path: name,
      data,
      directory: Directory.Cache,
      recursive: true,
    });
    await Share.share({
      title: name,
      text: 'Informe de comunidades',
      url: uri,
      dialogTitle: 'Compartir informe',
    });
  }

  private toBase64(value: string): string {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }
}
