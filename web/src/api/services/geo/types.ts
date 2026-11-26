export interface EnderecoCep {
  cep: string;
  rua: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface SugestaoRua extends EnderecoCep {
  rotulo?: string;
}
