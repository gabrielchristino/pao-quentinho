import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../environments/environment';
import { catchError, forkJoin, of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EstabelecimentosService } from '../services/estabelecimentos.service';
import { Estabelecimento } from '../estabelecimento.model';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

interface Reserva {
  id: number;
  created_at: string;
  user_name: string;
  user_email: string;
  reservation_time?: string;
}

interface GrupoReserva {
  horario: string; // Ex: "14:30"
  data: string;    // Ex: "22/12/2025"
  descricao?: string; // Ex: "Pão Francês"
  reservas: Reserva[];
  ts: number; // Timestamp para ordenação
}

@Component({
  selector: 'app-lista-reservas',
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule
  ],
  templateUrl: './lista-reservas.component.html',
  styleUrls: ['./lista-reservas.component.scss']
})
export class ListaReservasComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private location = inject(Location);
  private snackBar = inject(MatSnackBar);
  private estabelecimentosService = inject(EstabelecimentosService);
  private apiUrl = environment.apiUrl;

  isLoading = true;
  gruposReservas: GrupoReserva[] = [];
  allGruposReservas: GrupoReserva[] = []; // Cópia para filtragem
  searchControl = new FormControl('');
  estabelecimentoId: number | null = null;

  ngOnInit(): void {
    this.estabelecimentoId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.estabelecimentoId) {
      this.carregarReservas(this.estabelecimentoId);
    }
    this.searchControl.valueChanges.subscribe(val => this.filtrarReservas(val));
  }

  carregarReservas(id: number): void {
    forkJoin({
      reservas: this.http.get<Reserva[]>(`${this.apiUrl}/estabelecimentos/${id}/reservas`),
      est: this.estabelecimentosService.getEstabelecimentoById(id.toString())
    })
      .pipe(
        catchError(err => {
          console.error('Erro ao carregar dados', err);
          this.snackBar.open('Erro ao carregar a lista de reservas.', 'Fechar', { duration: 3000 });
          return of({ reservas: [], est: null });
        })
      )
      .subscribe(({ reservas, est }) => {
        if (est) this.agruparReservas(reservas, est);
        this.isLoading = false;
      });
  }

  private agruparReservas(reservas: Reserva[], est: Estabelecimento): void {
    const grupos: { [key: string]: GrupoReserva } = {};

    reservas.forEach(reserva => {
      const dataObj = new Date(reserva.created_at);
      const dataStr = dataObj.toLocaleDateString('pt-BR');
      
      // Usa o horário da reserva (fornada) se existir, senão usa o horário de criação
      const horaStr = reserva.reservation_time || dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      // Tenta encontrar a descrição da fornada correspondente ao horário
      let descricao = '';
      if (reserva.reservation_time && est.proximaFornada) {
        const fornadaEncontrada = est.proximaFornada.find(f => {
          if (typeof f === 'string') return f === reserva.reservation_time;
          return f.time === reserva.reservation_time;
        });

        if (fornadaEncontrada && typeof fornadaEncontrada !== 'string') {
          descricao = fornadaEncontrada.description || '';
        }
      }

      // Chave única para agrupamento (Data + Hora)
      const chave = `${dataStr} - ${horaStr}`;

      if (!grupos[chave]) {
        grupos[chave] = { 
          horario: horaStr, 
          data: dataStr, 
          descricao, 
          reservas: [],
          ts: dataObj.getTime() // Salva o timestamp para ordenação
        };
      }
      grupos[chave].reservas.push(reserva);
    });

    // Ordena os grupos do mais recente para o mais antigo
    this.allGruposReservas = Object.values(grupos).sort((a, b) => b.ts - a.ts);
    this.gruposReservas = this.allGruposReservas;
  }

  filtrarReservas(termo: string | null): void {
    if (!termo) {
      this.gruposReservas = this.allGruposReservas;
      return;
    }
    const lowerTerm = termo.toLowerCase();
    this.gruposReservas = this.allGruposReservas.map(grupo => ({
      ...grupo,
      reservas: grupo.reservas.filter(r =>
        r.user_name.toLowerCase().includes(lowerTerm) ||
        r.user_email.toLowerCase().includes(lowerTerm)
      )
    })).filter(grupo => grupo.reservas.length > 0);
  }

  voltar(): void {
    this.location.back();
  }
}