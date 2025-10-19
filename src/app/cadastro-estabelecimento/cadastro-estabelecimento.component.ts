import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray, FormControl } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { finalize, switchMap } from 'rxjs';
import { Router } from '@angular/router';
import { EstabelecimentosService } from '../services/estabelecimentos.service';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../services/auth.service';
import { AuthDialogComponent } from '../auth-dialog/auth-dialog.component';

@Component({
  selector: 'app-cadastro-estabelecimento',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatSnackBarModule,
    MatChipsModule,
  ],
  templateUrl: './cadastro-estabelecimento.component.html',
  styleUrl: './cadastro-estabelecimento.component.scss'
})
export class CadastroEstabelecimentoComponent {
  private fb = inject(FormBuilder);
  private estabelecimentosService = inject(EstabelecimentosService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);

  isLoading = false;
  form: FormGroup;
  fornadaControl = new FormControl('', [Validators.required]);
  // Propriedades para armazenar as coordenadas internamente
  private latitude: number | null = null;
  private longitude: number | null = null;
  
  constructor() {
    this.form = this.fb.group({
      nome: ['', Validators.required],
      info: ['', Validators.required],
      tipo: ['padaria', Validators.required],
      horarioAbertura: ['', Validators.required],
      horarioFechamento: ['', Validators.required],
      horariosFornada: this.fb.array([]),
      endereco: this.fb.group({
        cep: ['', [Validators.required, Validators.pattern(/^\d{5}-\d{3}$/)]],
        rua: ['', Validators.required],
        numero: ['', Validators.required],
        bairro: ['', Validators.required],
        cidade: ['', Validators.required],
        estado: ['', Validators.required],
        complemento: ['']
      }),
    });
  }

  get horariosFornada(): FormArray {
    return this.form.get('horariosFornada') as FormArray;
  }

  adicionarHorarioFornada(): void {
    if (this.fornadaControl.invalid) {
      this.snackBar.open('Por favor, selecione um horário.', 'Fechar', { duration: 3000 });
      return;
    }

    const novoHorario = this.fornadaControl.value;

    if (this.horariosFornada.value.includes(novoHorario)) {
      this.snackBar.open('Este horário já foi adicionado.', 'Fechar', { duration: 3000 });
      return;
    }

    this.horariosFornada.push(this.fb.control(novoHorario));
    this.fornadaControl.reset();
  }

  removeHorario(index: number): void {
    this.horariosFornada.removeAt(index);
  }

  buscarPorCep(): void {
    const cep = this.form.get('endereco.cep')?.value;
    if (!cep || this.form.get('endereco.cep')?.invalid) {
      this.snackBar.open('Por favor, insira um CEP válido.', 'Fechar', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    this.estabelecimentosService.getEnderecoPorCep(cep).pipe(
      // Encadeia a busca de endereço com a busca de coordenadas
      switchMap(dadosEndereco => {
        if (dadosEndereco.erro) {
          throw new Error('CEP não encontrado.');
        }
        this.form.get('endereco')?.patchValue({
          rua: dadosEndereco.logradouro,
          bairro: dadosEndereco.bairro,
          cidade: dadosEndereco.localidade,
          estado: dadosEndereco.uf
        });
        this.snackBar.open('Endereço encontrado! Buscando coordenadas...', 'Ok', { duration: 2000 });
        
        const enderecoCompleto = `${dadosEndereco.logradouro}, ${dadosEndereco.localidade}, ${dadosEndereco.uf}`;
        return this.estabelecimentosService.getCoordenadasPorEndereco(enderecoCompleto);
      }),
      finalize(() => this.isLoading = false) // Finaliza o loading ao final de tudo
    ).subscribe({
      next: (dadosCoordenadas) => {
        if (dadosCoordenadas && dadosCoordenadas.length > 0) {
          this.latitude = parseFloat(dadosCoordenadas[0].lat);
          this.longitude = parseFloat(dadosCoordenadas[0].lon);
          this.snackBar.open('Endereço e coordenadas preenchidos com sucesso!', 'Ok', { duration: 3000 });
        } else {
          this.snackBar.open('Não foi possível encontrar as coordenadas para este CEP. Por favor, preencha manualmente.', 'Fechar', { duration: 5000 });
          return;
        }
      },
      error: (err) => {
        this.snackBar.open(err.message || 'Erro ao buscar CEP. Tente novamente.', 'Fechar', { duration: 3000 });
        this.latitude = null;
        this.longitude = null;
      }
    });
  }

  usarLocalizacaoAtual(): void {
    if (!navigator.geolocation) {
      this.snackBar.open('Geolocalização não é suportada pelo seu navegador.', 'Fechar', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    this.snackBar.open('Obtendo sua localização...', 'Ok', { duration: 4000 });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        this.latitude = latitude;
        this.longitude = longitude;

        this.estabelecimentosService.getEnderecoPorLatLng(latitude, longitude).pipe(
          finalize(() => this.isLoading = false)
        ).subscribe({
          next: (dadosEndereco) => {
            const address = dadosEndereco.address;
            if (!address) {
              this.snackBar.open('Não foi possível encontrar um endereço para sua localização.', 'Fechar', { duration: 3000 });
              return;
            }
            this.form.get('endereco')?.patchValue({
              cep: address.postcode || '',
              rua: address.road || '',
              numero: address.house_number || '',
              bairro: address.suburb || '',
              cidade: address.city || address.town || '',
              estado: address.state || ''
            });
            this.snackBar.open('Endereço preenchido com sua localização atual!', 'Ok', { duration: 3000 });
          },
          error: () => this.snackBar.open('Erro ao buscar endereço pela localização.', 'Fechar', { duration: 3000 })
        });
      },
      () => {
        this.isLoading = false;
        this.snackBar.open('Não foi possível obter sua localização. Verifique as permissões do navegador.', 'Fechar', { duration: 5000 });
      }
    );
  }

  onSubmit(): void {
    if (!this.authService.isLoggedIn()) {
      this.snackBar.open('Faça login ou cadastre-se para salvar um estabelecimento.', 'Ok', { duration: 5000 });
      const dialogRef = this.dialog.open(AuthDialogComponent, {
        width: '450px'
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result === true) { // Se o login/cadastro foi bem sucedido
          this.snackBar.open('Agora você pode salvar seu estabelecimento!', 'Ok', { duration: 3000 });
          this.prosseguirComSubmit(); // Tenta o submit novamente
        }
      });
      return;
    }

    this.prosseguirComSubmit();
  }

  private prosseguirComSubmit(): void {
    if (this.form.invalid) {
      this.snackBar.open('Por favor, preencha todos os campos do formulário.', 'Fechar', { duration: 3000 });
      return;
    }

    if (!this.latitude || !this.longitude) {
      this.snackBar.open('Coordenadas não encontradas. Use a busca por CEP para obtê-las.', 'Fechar', { duration: 4000 });
      return;
    }

    this.isLoading = true;
    const formValue = this.form.getRawValue();

    // Adapta o payload para o formato esperado pelo backend
    const payload = {
      nome: formValue.nome,
      tipo: formValue.tipo,
      latitude: this.latitude,
      longitude: this.longitude,
      details: {
        info: formValue.info,
        horarioAbertura: formValue.horarioAbertura,
        horarioFechamento: formValue.horarioFechamento,
        proximaFornada: formValue.horariosFornada, // O backend deve tratar isso como a lista de horários
        endereco: formValue.endereco
      }
    };

    this.estabelecimentosService.salvarEstabelecimento(payload).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (novoEstabelecimento) => {
        this.salvarIdLocalmente(novoEstabelecimento.id);

        // Exibe uma mensagem de sucesso com uma ação para ver a página criada
        const snackBarRef = this.snackBar.open(
          'Estabelecimento cadastrado com sucesso!',
          'Ver página',
          { duration: 10000 } // Aumenta a duração para dar tempo de clicar
        );

        // Se o usuário clicar em "Ver página", navega para a URL do estabelecimento
        snackBarRef.onAction().subscribe(() => {
          this.router.navigate(['/estabelecimento', novoEstabelecimento.id]);
        });
      },
      error: (err) => {
        console.error('Erro ao cadastrar:', err);
        this.snackBar.open('Ocorreu um erro ao cadastrar. Tente novamente.', 'Fechar', { duration: 3000 });
      }
    });
  }

  private salvarIdLocalmente(id: number): void {
    const meusIds = JSON.parse(localStorage.getItem('meus-estabelecimentos') || '[]');
    if (!meusIds.includes(id)) {
      meusIds.push(id);
      localStorage.setItem('meus-estabelecimentos', JSON.stringify(meusIds));
    }
  }
}