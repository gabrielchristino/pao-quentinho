import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Plan, PlansService } from '../services/plans.service';
import { Observable, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [
    CommonModule,
    MatExpansionModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatCardModule
  ],
  templateUrl: './plans.component.html',
  styleUrl: './plans.component.scss'
})
export class PlansComponent implements OnInit {
  plans$!: Observable<Plan[]>;
  isLoading = false;

  constructor(
    private plansService: PlansService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.plans$ = this.plansService.getPlans();
  }

  assinarPlano(plan: Plan): void {
    this.isLoading = true;
    // Futuramente, aqui entraria a lógica de pagamento.
    // Por enquanto, apenas atualizamos o plano do usuário.
    this.plansService.updateUserPlan(plan.id)
      .pipe(
        // Após o plano ser atualizado no backend, chamamos o refreshToken para obter o novo token.
        switchMap(() => this.authService.refreshToken())
      )
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.snackBar.open(`Parabéns! Você agora é um assinante ${plan.name}.`, 'Oba!', { duration: 5000 });
          this.router.navigate(['/']); // Redireciona para o mapa
        },
        error: (err) => {
          this.isLoading = false;
          this.snackBar.open('Ops! Não foi possível assinar o plano. Tente novamente.', 'Fechar', { duration: 5000 });
          console.error('Erro ao assinar plano:', err);
        }
      });
  }
}