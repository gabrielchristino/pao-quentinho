import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpResponse } from '@angular/common/http';

export interface Endereco {
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  complemento?: string;
}

export interface Estabelecimento {
  latitude: number;
  longitude: number;
  nome: string;
  tipo: 'padaria' | 'doceria' | 'casaDeBolos' | 'outros'; // camelCase
  horarioAbertura: string;
  horarioFechamento: string;
  proximaFornada: string;
  endereco: Endereco;
  info: string;
  distanciaKm: number;
}

@Injectable({ providedIn: 'root' })
export class EstabelecimentosService {
  private readonly apiUrl = 'https://pao-quentinho-backend-production.up.railway.app/api';

  constructor(private http: HttpClient) {}

  getEstabelecimentosProximos(userLat: number, userLng: number): Observable<HttpResponse<Estabelecimento[]>> {
    // Passa a localização do usuário como query params para o backend calcular a distância
    return this.http.get<Estabelecimento[]>(`${this.apiUrl}/estabelecimentos?lat=${userLat}&lng=${userLng}`, { observe: 'response' });
  }
}
