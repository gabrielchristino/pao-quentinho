import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray, FormControl, } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { finalize, switchMap } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { EstabelecimentosService } from '../services/estabelecimentos.service';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../services/auth.service';
import { Estabelecimento } from '../estabelecimento.model';
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
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);

  isLoading = false;
  form: FormGroup;
  fornadaControl = new FormControl('', [Validators.required]);
  // Propriedades para armazenar as coordenadas internamente
  private latitude: number | null = null;
  private longitude: number | null = null;

  isEditMode = false;
  private estabelecimentoId: number | null = null;
  
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

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.estabelecimentoId = +id;
        this.carregarDadosParaEdicao(+id);
      }
    });
  }

  private carregarDadosParaEdicao(id: number): void {
    this.isLoading = true;
    this.estabelecimentosService.getEstabelecimentoById(id.toString()).pipe( // Corrigido: chamada de método
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (est: Estabelecimento) => { // Corrigido: tipagem do parâmetro
        // Popula o formulário com os dados recebidos
        this.form.patchValue({
          nome: est.nome,
          info: est.info,
          tipo: est.tipo,
          horarioAbertura: est.horarioAbertura,
          horarioFechamento: est.horarioFechamento,
          endereco: est.endereco
        });

        // Popula o array de fornadas
        if (est.proximaFornada && est.proximaFornada.length > 0) {
          est.proximaFornada.forEach((horario: string) => {
            this.horariosFornada.push(this.fb.control(horario));
          });
        }

        // Armazena as coordenadas
        this.latitude = est.latitude;
        this.longitude = est.longitude;

        this.snackBar.open('Dados carregados para edição.', 'Ok', { duration: 2000 });
      },
      error: () => {
        this.snackBar.open('Erro ao carregar dados do estabelecimento.', 'Fechar', { duration: 3000 });
        this.router.navigate(['/meus-estabelecimentos']);
      }
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
    this.prosseguirComSubmit(); // A lógica de login já foi removida, podemos chamar diretamente
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
      // O backend espera os campos adicionais dentro de um objeto 'details'
      details: {
        info: formValue.info,
        horarioAbertura: formValue.horarioAbertura,
        horarioFechamento: formValue.horarioFechamento,
        proximaFornada: formValue.horariosFornada,
        endereco: formValue.endereco
      }
    };

    const saveObservable = this.isEditMode // Corrigido: erro de sintaxe 'const-'
      ? this.estabelecimentosService.updateEstabelecimento(this.estabelecimentoId!, payload)
      : this.estabelecimentosService.salvarEstabelecimento(payload);

    saveObservable.pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (estabelecimentoSalvo: Estabelecimento) => { // Corrigido: tipagem do parâmetro
        if (!this.isEditMode) {
          this.salvarIdLocalmente(estabelecimentoSalvo.id);
        }
        this.snackBar.open(
          `Estabelecimento ${this.isEditMode ? 'atualizado' : 'cadastrado'} com sucesso!`,
          'Ok',
          { duration: 3000 }
        );
        // Redireciona o usuário para a página de gerenciamento
        this.router.navigate(['/meus-estabelecimentos']);
      },
      error: (err: any) => { // Corrigido: tipagem do parâmetro
        console.error(`Erro ao ${this.isEditMode ? 'atualizar' : 'cadastrar'}:`, err);
        const message = err.error?.message || `Ocorreu um erro ao ${this.isEditMode ? 'atualizar' : 'cadastrar'}. Tente novamente.`;
        this.snackBar.open(message, 'Fechar', { duration: 4000 });
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