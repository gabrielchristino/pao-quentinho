export interface Estabelecimento {
  id: number;
  nome: string;
  tipo: string;
  latitude: number;
  longitude: number;
  distanciaKm?: number;
  info: string;
  proximaFornada: string[];
  horarioAbertura: string;
  horarioFechamento: string;
  endereco: {
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
}
