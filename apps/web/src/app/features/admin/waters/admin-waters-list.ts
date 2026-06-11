import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-admin-waters-list',
  templateUrl: './admin-waters-list.html',
  styleUrl: './admin-waters-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminWatersList {}
