import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { DemoComponent } from './sections/demo.component';
import { FeaturesComponent } from './sections/features.component';
import { FooterComponent } from './footer.component';
import { HeroComponent } from './sections/hero.component';
import { HowComponent } from './sections/how.component';
import { NavComponent } from './nav.component';
import { PlansComponent } from './sections/plans.component';
import { ProblemComponent } from './sections/problem.component';
import { RolesComponent } from './sections/roles.component';
import { TeamComponent } from './sections/team.component';
import { TrustComponent } from './sections/trust.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NavComponent,
    HeroComponent,
    ProblemComponent,
    HowComponent,
    FeaturesComponent,
    RolesComponent,
    TrustComponent,
    PlansComponent,
    TeamComponent,
    DemoComponent,
    FooterComponent,
  ],
  template: `
    <div id="top" class="sentinel"></div>
    <app-nav />
    <main>
      <app-hero [play]="true" />
      <app-problem />
      <app-how />
      <app-features />
      <app-roles />
      <app-trust />
      <app-plans />
      <app-team />
      <app-demo />
    </main>
    <app-footer />
  `,
  styles: `
    .sentinel { position: absolute; top: 0; left: 0; width: 1px; height: 1px; pointer-events: none; }
  `,
})
export class LandingPage {
  /** True once the loader curtain starts to open; the hero uses it to start its intro. */
  protected readonly ready = signal(false);
}
