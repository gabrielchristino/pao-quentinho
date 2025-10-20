import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-auth-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './auth-dialog.component.html',
  styleUrl: './auth-dialog.component.scss'
})
export class AuthDialogComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  public dialogRef = inject(MatDialogRef<AuthDialogComponent>);

  loginForm: FormGroup;
  registerForm: FormGroup;
  isLoading = false;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onLogin(): void {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.authService.login(this.loginForm.value).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: () => {
        this.snackBar.open('Login realizado com sucesso!', 'Ok', { duration: 3000 });
        this.dialogRef.close(true); // Fecha o modal com sucesso
      },
      error: (err) => {
        const message = err.status === 401 ? 'Credenciais inválidas.' : 'Erro ao fazer login.';
        this.snackBar.open(message, 'Fechar', { duration: 3000 });
      }
    });
  }

  onRegister(): void {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    this.authService.register(this.registerForm.value).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: () => {
        // O novo fluxo no AuthService já faz o login e a sincronização.
        this.snackBar.open('Cadastro e login realizados com sucesso!', 'Ok', { duration: 3000 });
        this.dialogRef.close(true); // Fecha o modal com sucesso
      },
      error: (err) => {
        const message = err.status === 409 ? 'Este email já está em uso.' : 'Erro ao se cadastrar.';
        this.snackBar.open(message, 'Fechar', { duration: 3000 });
      }
    });
  }
}