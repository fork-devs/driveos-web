import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { BranchDto } from '../../domain/backend';
import { toBranch } from '../../domain/mappers';
import { Branch } from '../../domain/models';
import { branches as mockBranches } from '../api/mock-data';
import { AuthService } from '../auth/auth.service';
import { API_BASE, USE_MOCKS } from '../config';

/**
 * The branch (sede) the signed-in user works in. Most backend queries are scoped by branchId, so every
 * API client reads it from here. An owner can switch between the branches of the workshop; an employee
 * is fixed to the branch of their registration.
 */
@Injectable({ providedIn: 'root' })
export class BranchContext {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly picked = signal<Branch | null>(null);

  readonly branches = signal<Branch[]>(USE_MOCKS ? mockBranches : []);
  readonly selected = computed(() => this.picked() ?? this.auth.profile()?.currentBranch ?? null);

  constructor() {
    effect(() => {
      const profile = this.auth.profile();
      this.picked.set(null);
      if (USE_MOCKS) return;
      const own = profile?.currentBranch;
      if (!profile || !profile.workshopId || profile.role === 'technician') {
        this.branches.set(own ? [own] : []);
        return;
      }
      this.http.get<BranchDto[]>(`${API_BASE}/branches`, { params: { workshopId: profile.workshopId } }).subscribe({
        next: (list) => this.branches.set(list.map(toBranch)),
        error: () => this.branches.set(own ? [own] : []),
      });
    });
  }

  select(branch: Branch): void {
    this.picked.set(branch);
  }

  /** Id for a backend query; throws inside the caller's observable when nobody is signed in. */
  requireId(): string {
    const branch = this.selected();
    if (!branch) throw new Error('No branch selected');
    return branch.id;
  }
}
