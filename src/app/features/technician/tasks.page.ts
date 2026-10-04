import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { TranslocoPipe } from '@jsverse/transloco';
import { loadable } from '../../core/api/loadable';
import { OfflineSyncService } from '../../core/offline/offline-sync.service';
import { WorkOrdersApi } from '../../domain/api';
import { TaskStatus, TaskView } from '../../domain/models';
import { AsyncStateComponent } from '../../shared/async-state.component';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

const ORDER: Record<TaskStatus, number> = { IN_PROGRESS: 0, PENDING: 1, DONE: 2 };

/**
 * The technician's bay screen: big touch targets, one action per task, works offline.
 * A change shows at once and is sent (or queued) in the background, so the screen never waits on the network.
 * Evidence photos stay on the device for now; upload to object storage comes with the backend.
 */
@Component({
  selector: 'app-tasks',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe, AsyncStateComponent, StatusBadgeComponent, MatButtonModule, MatCardModule],
  styleUrl: '../page.scss',
  styles: `
    .list { display: grid; gap: 12px; }

    .task { display: grid; gap: 16px; padding: clamp(18px, 2.4vw, 26px); border-radius: var(--r-card); }
    .task.done { opacity: 0.72; }

    .top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .title { font-size: 1.2rem; font-weight: 700; letter-spacing: -0.02em; line-height: 1.25; }
    .meta { color: var(--muted); font-size: 0.95rem; margin-top: 4px; }

    .actions { display: flex; flex-wrap: wrap; gap: 10px; }
    .actions button { min-height: 56px; flex: 1 1 160px; font-size: 1.05rem; }

    .thumbs { display: flex; flex-wrap: wrap; gap: 8px; }
    .thumbs img { width: 72px; height: 72px; object-fit: cover; border-radius: 12px; border: 1px solid var(--line); }
  `,
  template: `
    <div class="head">
      <h1>{{ 'app.tasks.title' | transloco }}</h1>
      <p>{{ 'app.tasks.sub' | transloco }}</p>
    </div>

    <app-async-state [loading]="source.loading()" [error]="source.error()" [empty]="items().length === 0"
      emptyKey="app.tasks.empty" (retry)="source.reload()">
      <div class="list">
        @for (t of items(); track t.id) {
          <mat-card appearance="outlined" class="task" [class.done]="t.status === 'DONE'">
            <div class="top">
              <div>
                <p class="title">{{ t.title }}</p>
                <p class="meta"><strong>{{ t.plate }}</strong>, {{ t.vehicle }}, {{ t.orderCode }}</p>
              </div>
              <app-badge [value]="t.status" />
            </div>

            @if (photos()[t.id]?.length) {
              <div class="thumbs">
                @for (src of photos()[t.id]; track src) {
                  <img [src]="src" [alt]="'app.tasks.photoAlt' | transloco" />
                }
              </div>
            }

            @if (t.status !== 'DONE') {
              <div class="actions">
                <button mat-stroked-button type="button" (click)="cam.click()">
                  <i class="ph ph-camera" aria-hidden="true"></i>
                  {{ 'app.tasks.photo' | transloco }}
                </button>
                <input #cam hidden type="file" accept="image/*" capture="environment" (change)="addPhoto(t.id, $event)" />
                @if (t.status === 'PENDING') {
                  <button mat-flat-button type="button" (click)="set(t, 'IN_PROGRESS')">
                    <i class="ph ph-play" aria-hidden="true"></i>{{ 'app.tasks.start' | transloco }}
                  </button>
                } @else {
                  <button mat-flat-button type="button" (click)="set(t, 'DONE')">
                    <i class="ph ph-check" aria-hidden="true"></i>{{ 'app.tasks.finish' | transloco }}
                  </button>
                }
              </div>
            }
          </mat-card>
        }
      </div>
    </app-async-state>
  `,
})
export class TasksPage {
  private readonly api = inject(WorkOrdersApi);
  private readonly sync = inject(OfflineSyncService);
  private readonly urls: string[] = [];

  protected readonly source = loadable(() => this.api.myTasks());
  /** Status changes made on this device, shown before the server confirms them. */
  private readonly overrides = signal<Record<string, TaskStatus>>({});
  protected readonly photos = signal<Record<string, string[]>>({});

  protected readonly items = computed(() =>
    (this.source.data() ?? [])
      .map((t): TaskView => ({ ...t, status: this.overrides()[t.id] ?? t.status }))
      .sort((a, b) => ORDER[a.status] - ORDER[b.status]),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.urls.forEach((u) => URL.revokeObjectURL(u)));
  }

  protected set(task: TaskView, status: TaskStatus): void {
    this.overrides.update((o) => ({ ...o, [task.id]: status }));
    void this.sync.submit(task.id, status);
  }

  protected addPhoto(taskId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    this.urls.push(url);
    this.photos.update((p) => ({ ...p, [taskId]: [...(p[taskId] ?? []), url] }));
    input.value = '';
  }
}
