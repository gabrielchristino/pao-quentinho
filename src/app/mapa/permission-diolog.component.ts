import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

// Interface para os dados que o diálogo receberá
export interface PermissionDialogData {
  icon: string;
  title: string;
  content: string;
  confirmButton: string;
  cancelButton: string;
}

@Component({
  selector: 'app-permission-dialog',
  template: `
    <h2 mat-dialog-title class="dialog-header">
      <mat-icon class="dialog-icon" aria-hidden="false">{{ data.icon }}</mat-icon>
      <span>{{ data.title }}</span>
    </h2>
    <mat-dialog-content>
      <p>{{ data.content }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onNoClick()">{{ data.cancelButton }}</button>
      <button mat-flat-button color="primary" [mat-dialog-close]="true" cdkFocusInitial>{{ data.confirmButton }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header { display: flex; align-items: center; gap: 12px; padding-top: 16px; }
    .dialog-icon { font-size: 28px; width: 28px; height: 28px; color: #d96c2c; }
  `],
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
})
export class PermissionDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<PermissionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PermissionDialogData,
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
