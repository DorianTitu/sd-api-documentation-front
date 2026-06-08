import { Component, Input } from '@angular/core';

import { type AdminView, type AdminSchemaItem } from '../../shared/models/portal.models';

export interface DashboardActivityItem {
  kind: string;
  title: string;
  description: string;
  date: string;
  icon: string;
}

export interface DashboardVm {
  schemaCount: number;
  publicSchemaCount: number;
  privateSchemaCount: number;
  endpointCount: number;
  visibleEndpointCount: number;
  hiddenEndpointCount: number;
  pendingEndpointCount: number;
  coveragePercent: number;
  donutDasharray: string;
  activityFeed: DashboardActivityItem[];
  formatDate: (value?: string) => string;
  navigate: (view: AdminView) => void;
  schemas: AdminSchemaItem[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  @Input({ required: true }) vm!: DashboardVm;
}
