export interface Fornada {
  id?: string;
  time: string;
  description?: string;
}

export interface Estabelecimento {
  id: number;
  nome: string;
  tipo: string;
  latitude: number;
  longitude: number;
  distanciaKm?: number;
  info: string;
  proximaFornada: (string | Fornada)[]; // Suporta string antiga ou objeto novo
  horarioAbertura: string | string[];
  horarioFechamento: string | string[];
  endereco: {
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  followers_count?: number;
}
