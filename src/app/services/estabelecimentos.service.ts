import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Estabelecimento } from '../estabelecimento.model';

@Injectable({ providedIn: 'root' })
export class EstabelecimentosService {
  private readonly apiUrl = 'https://pao-quentinho-backend-production.up.railway.app/api';

  constructor(private http: HttpClient) {}

  getEstabelecimentosProximos(userLat: number, userLng: number): Observable<HttpResponse<Estabelecimento[]>> {
    // Passa a localização do usuário como query params para o backend calcular a distância
    return this.http.get<Estabelecimento[]>(`${this.apiUrl}/estabelecimentos?lat=${userLat}&lng=${userLng}`, { observe: 'response' });
  }

  getEstabelecimentoById(id: string): Observable<Estabelecimento> {
    return this.http.get<Estabelecimento>(`${this.apiUrl}/estabelecimentos/${id}`);
  }
}
