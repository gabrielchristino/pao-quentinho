import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Estabelecimento } from '../estabelecimento.model';

export interface GeocodingResult {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

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

  getMeusEstabelecimentos(): Observable<Estabelecimento[]> {
    return this.http.get<Estabelecimento[]>(`${this.apiUrl}/users/me/estabelecimentos`);
  }

  salvarEstabelecimento(estabelecimento: Partial<Estabelecimento>): Observable<Estabelecimento> {
    return this.http.post<Estabelecimento>(`${this.apiUrl}/estabelecimentos`, estabelecimento);
  }

  updateEstabelecimento(id: number, estabelecimento: any): Observable<Estabelecimento> {
    return this.http.put<Estabelecimento>(`${this.apiUrl}/estabelecimentos/${id}`, estabelecimento);
  }

  deleteEstabelecimento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/estabelecimentos/${id}`);
  }

  // Este método não usa a apiUrl, pois se conecta diretamente ao ViaCEP
  getEnderecoPorCep(cep: string): Observable<GeocodingResult> {
    return this.http.get<GeocodingResult>(`https://viacep.com.br/ws/${cep}/json/`);
  }

  // Busca coordenadas (lat/lng) a partir de um endereço usando a API Nominatim
  getCoordenadasPorEndereco(endereco: string): Observable<any[]> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}`;
    return this.http.get<any[]>(url);
  }

  // Busca endereço a partir de coordenadas (lat/lng) usando a API Nominatim (Reverse Geocoding)
  getEnderecoPorLatLng(lat: number, lng: number): Observable<any> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    return this.http.get<any>(url);
  }
}
