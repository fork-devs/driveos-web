import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTableModule } from '@angular/material/table';
import { loadable } from '../../core/api/loadable';
import { InventoryApi } from '../../domain/api';
import { AsyncStateComponent } from '../../shared/async-state.component';
import { MoneyPipe, WhenPipe } from '../../shared/format.pipes';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

/**
 * Inventory Bounded Context: parts catalogue with FIFO batches.
 * Material accordion per product, mat-table for its batches, chip listbox for category.
 */
@Component({
  selector: 'app-inventory',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    AsyncStateComponent,
    StatusBadgeComponent,
    MoneyPipe,
    WhenPipe,
    MatChipsModule,
    MatExpansionModule,
    MatTableModule,
  ],
  styleUrl: '../page.scss',
  styles: `
    mat-chip-listbox { margin-bottom: 20px; }

    .item {
      margin-bottom: 12px;
      border: 1px solid var(--line);
      border-radius: var(--r-card) !important;
      box-shadow: none !important;
      transition: border-color 0.25s var(--ease-out);
    }
    .item.mat-expanded { border-color: var(--c-primary); box-shadow: var(--shadow-card) !important; }

    .row {
      display: grid;
      width: 100%;
      align-items: center;
      gap: 16px;
      grid-template-columns: minmax(0, 2.2fr) minmax(0, 1fr) 120px 130px 150px;
    }
    small.sub { display: block; color: var(--muted); }
    .sku { font-family: ui-monospace, monospace; }
    .stock strong { font-size: 1.15rem; }

    .batches-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 8px; }
    .batches-head span { font-size: 0.8rem; color: var(--muted); }
    table { width: 100%; background: transparent; }
    .lot { font-family: ui-monospace, monospace; font-weight: 700; }
    .fifo-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-left: 6px;
      padding: 2px 8px;
      border-radius: var(--r-pill);
      background: color-mix(in srgb, var(--c-primary) 15%, transparent);
      color: var(--link);
      font-weight: 700;
      font-size: 0.75rem;
    }

    @media (max-width: 900px) {
      .row { grid-template-columns: 1fr auto; row-gap: 8px; }
      .row > :nth-child(2), .row > :nth-child(3), .row > :nth-child(4) { grid-column: 1 / -1; }
    }
  `,
  template: `
    <div class="head">
      <span class="bc-badge inventory"><i class="ph ph-package"></i> Inventario Bounded Context</span>
      <h1 style="margin-top: 6px;">Catálogo y Control de Lotes FIFO</h1>
      <p>Gestión de repuestos automotrices con trazabilidad de lotes y costos reales por consumo.</p>
    </div>

    <mat-chip-listbox aria-label="Filtrar por categoría" [value]="categoryFilter()" (change)="categoryFilter.set($event.value ?? null)">
      <mat-chip-option [value]="null">Todas las categorías</mat-chip-option>
      @for (c of categories; track c) {
        <mat-chip-option [value]="c">{{ c }}</mat-chip-option>
      }
    </mat-chip-listbox>

    <app-async-state [loading]="products.loading()"
                     [error]="products.error()"
                     [empty]="items().length === 0"
                     emptyKey="app.inventory.empty"
                     (retry)="products.reload()">
      <mat-accordion>
        @for (p of items(); track p.id) {
          <mat-expansion-panel class="item" [expanded]="openId() === p.id"
                               (opened)="openId.set(p.id)" (closed)="close(p.id)">
            <mat-expansion-panel-header collapsedHeight="84px" expandedHeight="84px">
              <div class="row">
                <div>
                  <strong>{{ p.name }}</strong>
                  <small class="sub sku">SKU: {{ p.sku }} • {{ p.locationRack }}</small>
                </div>
                <div><span class="bc-badge inventory">{{ p.category }}</span></div>
                <div class="stock num">
                  <strong>{{ p.stock }} u.</strong>
                  <small class="sub">Mínimo: {{ p.minStock }}</small>
                </div>
                <div class="num">
                  <strong>{{ p.unitPrice | money }}</strong>
                  <small class="sub">Precio venta</small>
                </div>
                <div><app-badge [value]="p.stock <= p.minStock ? 'low' : 'ok'" /></div>
              </div>
            </mat-expansion-panel-header>

            <div class="batches-head">
              <h4 style="font-size: 0.92rem;"><i class="ph ph-stack"></i> Lotes en almacén (consumo FIFO)</h4>
              <span>Orden cronológico de salida</span>
            </div>

            <table mat-table class="batches" [dataSource]="p.batches">
              <ng-container matColumnDef="lot">
                <th mat-header-cell *matHeaderCellDef>Lote</th>
                <td mat-cell *matCellDef="let b; let i = index">
                  <span class="lot">{{ b.batchNumber }}</span>
                  @if (i === 0) { <span class="fifo-tag"><i class="ph ph-arrow-fat-right"></i> Sale primero</span> }
                </td>
              </ng-container>
              <ng-container matColumnDef="supplier">
                <th mat-header-cell *matHeaderCellDef>Proveedor</th>
                <td mat-cell *matCellDef="let b">{{ b.supplier }}</td>
              </ng-container>
              <ng-container matColumnDef="received">
                <th mat-header-cell *matHeaderCellDef>Ingreso</th>
                <td mat-cell *matCellDef="let b">{{ b.receivedAt | when }}</td>
              </ng-container>
              <ng-container matColumnDef="qty">
                <th mat-header-cell *matHeaderCellDef>Cantidad</th>
                <td mat-cell *matCellDef="let b"><strong>{{ b.qty }} u.</strong></td>
              </ng-container>
              <ng-container matColumnDef="cost">
                <th mat-header-cell *matHeaderCellDef>Costo unit.</th>
                <td mat-cell *matCellDef="let b">{{ b.unitCost | money }}</td>
              </ng-container>
              <ng-container matColumnDef="subtotal">
                <th mat-header-cell *matHeaderCellDef>Subtotal</th>
                <td mat-cell *matCellDef="let b"><strong>{{ b.qty * b.unitCost | money }}</strong></td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr mat-row *matRowDef="let row; columns: columns"></tr>
            </table>
          </mat-expansion-panel>
        }
      </mat-accordion>
    </app-async-state>
  `,
})
export class InventoryPage {
  private readonly api = inject(InventoryApi);

  protected readonly products = loadable(() => this.api.list());
  protected readonly openId = signal<string | null>('p-01');
  protected readonly categoryFilter = signal<string | null>(null);
  protected readonly columns = ['lot', 'supplier', 'received', 'qty', 'cost', 'subtotal'];

  protected readonly categories = [
    'LUBRICANTES',
    'FRENOS',
    'FILTROS',
    'SENSORES',
    'SISTEMA_ELECTRICO',
    'SUSPENSION',
  ] as const;

  protected readonly items = computed(() => {
    const cat = this.categoryFilter();
    let all = [...(this.products.data() ?? [])].sort(
      (a, b) => Number(b.stock <= b.minStock) - Number(a.stock <= a.minStock) || a.name.localeCompare(b.name),
    );
    if (cat) {
      all = all.filter((p) => p.category === cat);
    }
    return all;
  });

  protected close(id: string): void {
    this.openId.update((cur) => (cur === id ? null : cur));
  }
}
