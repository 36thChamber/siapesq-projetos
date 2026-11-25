export {};

declare global {
  interface Window {
    analisesAPI: {
      downloadAll(token: string): Promise<boolean>;

      downloadCsv(
        token: string,
        nome_arquivo: string
      ): Promise<{
        nomeOriginal: string;
        arrayBuffer: ArrayBuffer;
      }>;

      onProgress(
        callback: (data: {
          done: number;
          total: number;
          percent: number;
        }) => void
      ): () => void;

      searchTif(nome_arquivo: string): Promise<{
        nomeDescriptografado: string;
        base64: string;
      } | null>;

      searchTifWith30(
        nome_arquivo: string,
        nome_arquivo_30?: string
      ): Promise<{
        principal: {
          nomeOriginal: string;
          base64: string;
        } | null;
        arquivo_30: {
          nomeOriginal: string;
          base64: string;
        } | null;
      }>;
    };
    auth: {
      getToken(): Promise<string | null>;
      setToken(token: string): Promise<void>;
      clearToken(): Promise<void>;

      getUserData(): Promise<UserData | null>;
      setUserData(data: UserData): Promise<void>;
      clearUserData(): Promise<void>;

      clearAll(): Promise<void>;

      setAtualizacaoData(data: string): Promise<void>;
      getAtualizacaoData(): Promise<string | null>;
      clearDataAtualizacao(): Promise<void>;
    };
    species: {
      getSelected(): Promise<StoredSpecies | null>;
      setSelected(species: StoredSpecies | null): Promise<void>;
    };
    logger: {
      onLog(
        callback: (log: {
          level: string;
          message: string;
          timestamp: string;
        }) => void
      ): void;
    };
  }
}
