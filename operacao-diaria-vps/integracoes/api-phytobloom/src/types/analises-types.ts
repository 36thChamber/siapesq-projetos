export type Analise = {
  nome: string;
  tamanho: number;
  ultima_modificacao?: Date;
  etag?: string;
};

export type ListaAnalisesResponse = {
  analises: Analise[];
  total: number;
  proximo_token?: string;
};
