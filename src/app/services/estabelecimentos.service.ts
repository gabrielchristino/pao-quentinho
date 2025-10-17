import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { HttpResponse } from '@angular/common/http';

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
  tipo: 'padaria' | 'doceria' | 'casaDeBolos' | 'outros' | 'confeitaria'; // camelCase
  horarioAbertura: string;
  horarioFechamento: string;
  proximaFornada: string;
  endereco: Endereco;
  info: string;
  distanciaKm: number;
}

@Injectable({ providedIn: 'root' })
export class EstabelecimentosService {
  /**
   * Gera um ponto aleatório (latitude, longitude) dentro de um raio a partir de um ponto central.
   * @param centerLat Latitude do centro.
   * @param centerLng Longitude do centro.
   * @param radiusInKm Raio em quilômetros.
   * @returns Um objeto com a nova latitude e longitude.
   */
  private generateRandomPoint(centerLat: number, centerLng: number, radiusInKm: number) {
    const maxRadiusKm = 5;
    const earthRadiusKm = 6371;

    const effectiveRadiusInKm = Math.min(radiusInKm, maxRadiusKm);
    // Converte o raio para radianos
    const radiusInRad = effectiveRadiusInKm / earthRadiusKm;

    // Gera um ângulo e uma distância aleatórios
    const randomAngle = Math.random() * 2 * Math.PI;
    // Usa a raiz quadrada para uma distribuição mais uniforme dentro do círculo
    const randomDist = Math.sqrt(Math.random()) * radiusInRad;

    const centerLatRad = centerLat * (Math.PI / 180);
    const centerLngRad = centerLng * (Math.PI / 180);

    const newLatRad = Math.asin(
      Math.sin(centerLatRad) * Math.cos(randomDist) +
      Math.cos(centerLatRad) * Math.sin(randomDist) * Math.cos(randomAngle)
    );

    const newLngRad = centerLngRad + Math.atan2(
      Math.sin(randomAngle) * Math.sin(randomDist) * Math.cos(centerLatRad),
      Math.cos(randomDist) - Math.sin(centerLatRad) * Math.sin(newLatRad)
    );

    return { latitude: newLatRad * (180 / Math.PI), longitude: newLngRad * (180 / Math.PI) };
  }

  /**
   * Calcula a distância em KM entre duas coordenadas geográficas.
   * @param lat1 Latitude do ponto 1.
   * @param lon1 Longitude do ponto 1.
   * @param lat2 Latitude do ponto 2.
   * @param lon2 Longitude do ponto 2.
   * @returns A distância em quilômetros.
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Raio da Terra em km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distância em km
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  getEstabelecimentosProximos(userLat: number, userLng: number): Observable<HttpResponse<Estabelecimento[]>> {
    const estabelecimentos: Estabelecimento[] = [
      {
        nome: 'Padaria Pão do Bairro',
        tipo: 'padaria',
        horarioAbertura: '06:30',
        horarioFechamento: '20:00',
        proximaFornada: '16:30',
        endereco: {
          rua: 'Rua das Oliveiras',
          numero: '101',
          bairro: 'Jardim das Oliveiras',
          cidade: 'São Paulo',
          estado: 'SP',
          cep: '04810-000',
          complemento: 'Ao lado do mercado'
        },
        info: 'Pão francês quentinho toda hora! Venha experimentar nossos salgados.',
        distanciaKm: 1,
        latitude: 0, longitude: 0
      },
      {
        nome: 'Doceria Sabor Real',
        tipo: 'doceria',
        horarioAbertura: '08:00',
        horarioFechamento: '19:00',
        proximaFornada: '17:00',
        endereco: {
          rua: 'Avenida Real',
          numero: '200',
          bairro: 'Jardim Real',
          cidade: 'São Paulo',
          estado: 'SP',
          cep: '04811-000'
        },
        info: 'Doces finos e bolos decorados. Experimente nosso bolo de leite ninho!',
        distanciaKm: 1,
        latitude: 0, longitude: 0
      },
      {
        nome: 'Confeitaria Delícias da Vila',
        tipo: 'outros',
        horarioAbertura: '07:00',
        horarioFechamento: '18:00',
        proximaFornada: '15:30',
        endereco: {
          rua: 'Rua da Vila',
          numero: '55',
          bairro: 'Vila Nova',
          cidade: 'São Paulo',
          estado: 'SP',
          cep: '04812-000',
          complemento: 'Próximo ao parque'
        },
        info: 'Tortas e doces caseiros. Venha provar nossa torta de limão!',
        distanciaKm: 1,
        latitude: 0, longitude: 0
      },
      {
        nome: 'Casa de Bolos Dona Benta',
        tipo: 'casaDeBolos',
        horarioAbertura: '09:00',
        horarioFechamento: '18:30',
        proximaFornada: '14:30',
        endereco: {
          rua: 'Travessa dos Bolos',
          numero: '10',
          bairro: 'Vila Benta',
          cidade: 'São Paulo',
          estado: 'SP',
          cep: '04813-000'
        },
        info: 'Bolos caseiros e receitas tradicionais. Sinta o sabor da infância!',
        distanciaKm: 5,
        latitude: 0, longitude: 0
      },
      {
        nome: 'Padaria e Confeitaria Nova Era',
        tipo: 'padaria',
        horarioAbertura: '06:00',
        horarioFechamento: '21:00',
        proximaFornada: '18:00',
        endereco: {
          rua: 'Rua Nova Era',
          numero: '300',
          bairro: 'Nova Era',
          cidade: 'São Paulo',
          estado: 'SP',
          cep: '04814-000',
          complemento: 'Em frente à escola'
        },
        info: 'Pães, doces e bolos fresquinhos todos os dias. Venha conferir nossas promoções!',
        distanciaKm: 5,
        latitude: 0, longitude: 0
      }
    ];

    // Gera coordenadas dinâmicas para cada estabelecimento com base na localização do usuário
    const estabelecimentosDinamicos = estabelecimentos.map(est => {
      // Gera um ponto aleatório usando a `distanciaKm` como raio máximo
      const { latitude, longitude } = this.generateRandomPoint(userLat, userLng, est.distanciaKm);
      // Calcula a distância real para o ponto gerado
      const distanciaRealKm = this.calculateDistance(userLat, userLng, latitude, longitude);
      return { ...est, latitude, longitude, distanciaKm: distanciaRealKm };
    });

    return of(new HttpResponse({ body: estabelecimentosDinamicos, status: 200 }));
  }
}
