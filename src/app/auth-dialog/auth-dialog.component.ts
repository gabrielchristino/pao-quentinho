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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { NotificationService } from '../services/notification.service';

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
    MatTooltipModule,
    MatCheckboxModule
  ],
  templateUrl: './auth-dialog.component.html',
  styleUrl: './auth-dialog.component.scss'
})
export class AuthDialogComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
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
      password: ['', [Validators.required, Validators.minLength(6)]],
      isLojista: [false]
    });
  }

  onLogin(): void {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.authService.login(this.loginForm.value).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (syncResponse) => {
        this.dialogRef.close(); // Fecha o modal com sucesso

        // Redireciona o usuário com base no seu perfil
        const userRole = this.authService.getUserRole();
        if (userRole === 'lojista') {
          this.router.navigate(['/meus-estabelecimentos']);
        }

        // Após o login, dispara o fluxo de sincronização, que agora lida com a permissão.
        if (syncResponse?.syncedEstablishmentIds) {
          this.notificationService.triggerSubscriptionSync(syncResponse.syncedEstablishmentIds);
        }
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
      next: (syncResponse) => {
        // O novo fluxo no AuthService já faz o login e a sincronização.
        this.dialogRef.close(); // Fecha o modal com sucesso

        // Redireciona o usuário se ele for um lojista
        const userRole = this.authService.getUserRole();
        if (userRole === 'lojista') {
          this.router.navigate(['/meus-estabelecimentos']);
        }

        // Após o registro, também dispara o fluxo de sincronização.
        if (syncResponse?.syncedEstablishmentIds) {
          this.notificationService.triggerSubscriptionSync(syncResponse.syncedEstablishmentIds);
        }
      },
      error: (err) => {
        const message = err.status === 409 ? 'Este email já está em uso.' : 'Erro ao se cadastrar.';
        this.snackBar.open(message, 'Fechar', { duration: 3000 });
      }
    });
  }
}