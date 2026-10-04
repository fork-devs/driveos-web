import { Injectable, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { WorkOrdersApi } from '../../domain/api';
import { TaskStatus } from '../../domain/models';

interface PendingAction {
  key: string;
  taskId: string;
  status: TaskStatus;
}

const STORAGE_KEY = 'driveos.pending';

/**
 * Offline-first task updates (QA-04). Every change carries an idempotency key, so a retry after
 * the connection returns can never be applied twice. Pending changes survive a page reload.
 */
@Injectable({ providedIn: 'root' })
export class OfflineSyncService {
  private readonly api = inject(WorkOrdersApi);

  readonly online = signal(navigator.onLine);
  readonly pending = signal<PendingAction[]>(this.restore());
  readonly syncing = signal(false);

  constructor() {
    window.addEventListener('online', () => {
      this.online.set(true);
      void this.flush();
    });
    window.addEventListener('offline', () => this.online.set(false));

    effect(() => {
      const value = JSON.stringify(this.pending());
      try {
        localStorage.setItem(STORAGE_KEY, value);
      } catch {
        /* storage can be blocked, the queue then lives only in memory */
      }
    });

    if (this.online() && this.pending().length) void this.flush();
  }

  /** Sends a task status change now, or queues it when there is no connection. */
  async submit(taskId: string, status: TaskStatus): Promise<void> {
    const action: PendingAction = { key: crypto.randomUUID(), taskId, status };
    if (!this.online()) {
      this.pending.update((list) => [...list, action]);
      return;
    }
    try {
      await firstValueFrom(this.api.changeTaskStatus(taskId, status, action.key));
    } catch {
      this.pending.update((list) => [...list, action]);
    }
  }

  /** Replays queued changes in order. Stops at the first network failure and keeps the rest. */
  async flush(): Promise<void> {
    if (this.syncing() || !this.pending().length) return;
    this.syncing.set(true);
    try {
      for (const action of [...this.pending()]) {
        await firstValueFrom(this.api.changeTaskStatus(action.taskId, action.status, action.key));
        this.pending.update((list) => list.filter((a) => a.key !== action.key));
      }
    } catch {
      /* still offline or the server is down, try again on the next online event */
    } finally {
      this.syncing.set(false);
    }
  }

  private restore(): PendingAction[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as PendingAction[]) : [];
    } catch {
      return [];
    }
  }
}
