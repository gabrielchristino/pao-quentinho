import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

export interface NotificationDialogData {
  establishmentName: string;
}

export interface NotificationDialogResult {
  title: string;
  message: string;
}

@Component({
  selector: 'app-notification-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>Notificar seguidores</h2>
    <mat-dialog-content [formGroup]="form">
      <p>Envie uma mensagem para avisar sobre uma nova fornada ou promoção.</p>
      <p>Se você não digitar nada, não se preocupe, nosso sistema vai gerar uma.</p>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Título da Notificação</mat-label>
        <input matInput formControlName="title" placeholder="Ex: Pão quentinho saindo!">
      </mat-form-field>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Mensagem</mat-label>
        <textarea matInput formControlName="message" placeholder="Ex: Nosso pão francês premiado acabou de sair do forno. Venha buscar o seu!"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-flat-button color="primary" (click)="onSend()" [disabled]="form.invalid">Enviar</button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; }`]
})
export class NotificationDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<NotificationDialogComponent, NotificationDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: NotificationDialogData
  ) {
    this.form = this.fb.group({
      title: [''],
      message: ['']
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSend(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
