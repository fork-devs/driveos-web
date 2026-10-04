import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { loadable } from '../../core/api/loadable';
import { BillingApi } from '../../domain/api';
import { BillingInvoice, Quote } from '../../domain/models';
import { AsyncStateComponent } from '../../shared/async-state.component';
import { MoneyPipe, WhenPipe } from '../../shared/format.pipes';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

@Component({
  selector: 'app-billing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AsyncStateComponent, StatusBadgeComponent, MoneyPipe, WhenPipe, MatTabsModule, MatTableModule],
  styleUrl: '../page.scss',
  styles: `
    .tab-body { margin-top: 16px; }

    .invoice-table {
      width: 100%;
      background: transparent;
      font-size: 0.92rem;

      th { text-transform: uppercase; letter-spacing: 0.04em; font-size: 0.78rem; }
      td { padding-block: 12px; }
    }

    .doc-num {
      font-family: monospace;
      font-weight: 750;
      font-size: 0.95rem;
    }

    .tax-breakdown {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }

    .sunat-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: var(--r-pill);
      font-size: 0.76rem;
      font-weight: 700;

      &.accepted { background: color-mix(in srgb, var(--c-green) 15%, transparent); color: color-mix(in srgb, var(--c-green) 45%, var(--fg)); }
      &.pending { background: color-mix(in srgb, var(--c-accent) 15%, transparent); color: var(--c-accent); }
    }

    .quote-card {
      padding: 16px;
      border: 1px solid var(--line);
      border-radius: var(--r-card);
      background: var(--card);
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
  `,
  template: `
    <div class="head">
      <span class="bc-badge billing"><i class="ph ph-receipt"></i> Facturación & SUNAT Bounded Context</span>
      <h1 style="margin-top: 6px;">Facturación Electrónica y Cotizaciones</h1>
      <p>Emisión directa de Comprobantes de Pago Electrónicos (CPE) a SUNAT y pasarelas de pago.</p>
    </div>

    <app-async-state [loading]="invoices.loading() || quotes.loading()"
                     [error]="invoices.error() || quotes.error()"
                     (retry)="reloadAll()">
      <!-- Resumen Tributario del Día -->
      <div class="tax-breakdown">
        <div class="card" style="padding: 16px;">
          <p style="color: var(--muted); font-size: 0.85rem; font-weight: 600;">VENTAS FACTURADAS HOY</p>
          <p style="font-size: 1.8rem; font-weight: 800; margin-top: 4px; color: color-mix(in srgb, var(--c-green) 45%, var(--fg));">
            {{ totalBilledToday() | money }}
          </p>
          <span style="font-size: 0.8rem; color: var(--muted);">Incluye IGV 18%</span>
        </div>

        <div class="card" style="padding: 16px;">
          <p style="color: var(--muted); font-size: 0.85rem; font-weight: 600;">IGV FISCAL CALCULADO</p>
          <p style="font-size: 1.8rem; font-weight: 800; margin-top: 4px; color: var(--fg);">
            {{ totalIgvToday() | money }}
          </p>
          <span style="font-size: 0.8rem; color: var(--muted);">Tasa oficial SUNAT</span>
        </div>

        <div class="card" style="padding: 16px;">
          <p style="color: var(--muted); font-size: 0.85rem; font-weight: 600;">COTIZACIONES PENDIENTES</p>
          <p style="font-size: 1.8rem; font-weight: 800; margin-top: 4px; color: var(--c-accent);">
            {{ pendingQuotesCount() }}
          </p>
          <span style="font-size: 0.8rem; color: var(--muted);">Por aprobar por clientes</span>
        </div>
      </div>

      <mat-tab-group animationDuration="350ms" mat-stretch-tabs="false" [(selectedIndex)]="tabIndex">
        <mat-tab>
          <ng-template mat-tab-label><i class="ph ph-file-text"></i>&nbsp; Comprobantes emitidos (SUNAT)</ng-template>
          <section class="card tab-body" style="overflow-x: auto;">
            <table mat-table class="invoice-table" [dataSource]="invoiceList()">
              <ng-container matColumnDef="doc">
                <th mat-header-cell *matHeaderCellDef>Comprobante</th>
                <td mat-cell *matCellDef="let inv">
                  <span class="doc-num">{{ inv.number }}</span><br />
                  <span class="bc-badge billing" style="font-size: 0.7rem; padding: 1px 6px;">{{ inv.type }}</span>
                </td>
              </ng-container>
              <ng-container matColumnDef="customer">
                <th mat-header-cell *matHeaderCellDef>Cliente / Documento</th>
                <td mat-cell *matCellDef="let inv">
                  <strong>{{ inv.customerName }}</strong><br />
                  <small style="color: var(--muted);">{{ inv.customerDocument }}</small>
                </td>
              </ng-container>
              <ng-container matColumnDef="order">
                <th mat-header-cell *matHeaderCellDef>Orden / Placa</th>
                <td mat-cell *matCellDef="let inv">
                  {{ inv.workOrderCode }}<br />
                  <small style="font-family: ui-monospace, monospace; font-weight: 650;">{{ inv.plate }}</small>
                </td>
              </ng-container>
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Emisión</th>
                <td mat-cell *matCellDef="let inv">{{ inv.issueDate | when }}</td>
              </ng-container>
              <ng-container matColumnDef="method">
                <th mat-header-cell *matHeaderCellDef>Medio de pago</th>
                <td mat-cell *matCellDef="let inv"><span style="font-size: 0.85rem; font-weight: 600;">{{ inv.paymentMethod }}</span></td>
              </ng-container>
              <ng-container matColumnDef="sunat">
                <th mat-header-cell *matHeaderCellDef>Estado SUNAT</th>
                <td mat-cell *matCellDef="let inv">
                  <span class="sunat-pill" [class.accepted]="inv.sunatStatus === 'ACEPTADO'" [class.pending]="inv.sunatStatus !== 'ACEPTADO'">
                    <i class="ph" [class.ph-check]="inv.sunatStatus === 'ACEPTADO'" [class.ph-clock]="inv.sunatStatus !== 'ACEPTADO'"></i> {{ inv.sunatStatus }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="total">
                <th mat-header-cell *matHeaderCellDef style="text-align: right;">Total</th>
                <td mat-cell *matCellDef="let inv" style="text-align: right; font-weight: 800; font-size: 1.05rem;">{{ inv.total | money }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr mat-row *matRowDef="let row; columns: columns"></tr>
            </table>
          </section>
        </mat-tab>

        <mat-tab>
          <ng-template mat-tab-label><i class="ph ph-file-plus"></i>&nbsp; Cotizaciones y proformas</ng-template>
          <section class="tab-body">
            @for (q of quoteList(); track q.id) {
              <div class="quote-card">
                <div>
                  <span class="doc-num">{{ q.code }}</span>
                  <h3 style="font-size: 1.1rem; margin-top: 4px;">{{ q.customerName }}</h3>
                  <p style="color: var(--muted); font-size: 0.88rem;">
                    Vehículo: <strong>{{ q.vehicle }}</strong> • Válida hasta: {{ q.expiresAt | when }}
                  </p>
                </div>
                <div style="display: flex; align-items: center; gap: 14px;">
                  <span style="font-size: 1.3rem; font-weight: 800;">{{ q.total | money }}</span>
                  <app-badge [value]="q.status" />
                </div>
              </div>
            }
          </section>
        </mat-tab>
      </mat-tab-group>
    </app-async-state>
  `,
})
export class BillingPage {
  private readonly billingApi = inject(BillingApi);

  protected readonly invoices = loadable(() => this.billingApi.listInvoices());
  protected readonly quotes = loadable(() => this.billingApi.listQuotes());

  protected readonly tabIndex = signal(0);
  protected readonly columns = ['doc', 'customer', 'order', 'date', 'method', 'sunat', 'total'];

  protected readonly invoiceList = computed(() => this.invoices.data() ?? []);
  protected readonly quoteList = computed(() => this.quotes.data() ?? []);

  protected readonly totalBilledToday = computed(() =>
    this.invoiceList().reduce((acc, curr) => acc + curr.total, 0),
  );

  protected readonly totalIgvToday = computed(() =>
    this.invoiceList().reduce((acc, curr) => acc + curr.igv, 0),
  );

  protected readonly pendingQuotesCount = computed(() =>
    this.quoteList().filter((q) => q.status === 'PENDING').length,
  );

  protected reloadAll(): void {
    this.invoices.reload();
    this.quotes.reload();
  }
}
