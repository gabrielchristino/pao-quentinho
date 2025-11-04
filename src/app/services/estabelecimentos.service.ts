import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
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
    const params = new HttpParams()
      .set('lat', userLat.toString())
      .set('lng', userLng.toString());

    return this.http.get<Estabelecimento[]>(`${this.apiUrl}/estabelecimentos`, { params, observe: 'response' }).pipe(
      map(response => {
        const body = response.body?.map(this.flattenEstabelecimento) || [];
        return response.clone({ body });
      })
    );
  }

  getEstabelecimentoById(id: string): Observable<Estabelecimento> {
    return this.http.get<Estabelecimento>(`${this.apiUrl}/estabelecimentos/${id}`).pipe(
      map(this.flattenEstabelecimento)
    );
  }

  getMeusEstabelecimentos(): Observable<Estabelecimento[]> {
    return this.http.get<Estabelecimento[]>(`${this.apiUrl}/users/me/estabelecimentos`).pipe(
      map(estabelecimentos => estabelecimentos.map(this.flattenEstabelecimento))
    );
  }

  getMinhasInscricoes(): Observable<Estabelecimento[]> {
    return this.http.get<Estabelecimento[]>(`${this.apiUrl}/users/me/inscricoes`).pipe(
      map(estabelecimentos => estabelecimentos.map(this.flattenEstabelecimento))
    );
  }

  private flattenEstabelecimento(est: any): Estabelecimento {
    let finalEst: any;
    if (est.details) {
      const { details, ...rest } = est;
      finalEst = {
        ...rest,
        ...details
      };
    } else {
      finalEst = { ...est };
    }
    finalEst.proximaFornada = finalEst.proximaFornada || [];
    return finalEst as Estabelecimento;
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
