export {};

declare global {
  interface Window {
    analisesAPI: {
      downloadAll(token: string): Promise<{
        success: boolean;
        status: "completed" | "completed_with_errors" | "failed";
        total: number;
        processed: number;
        succeeded: number;
        failed: number;
        skipped: number;
        bytesTransferred: number;
        bytesTotal: number;
      }>;

      downloadCsv(
        token: string,
        nome_arquivo: string
      ): Promise<{
        nomeOriginal: string;
        arrayBuffer: ArrayBuffer;
      }>;

      downloadSelected(
        token: string,
        analise: {
          nome_pasta: string;
          arquivos: Array<string | null | undefined>;
        }
      ): Promise<{
        success: boolean;
        downloaded: string[];
        failed: string[];
      }>;

      onProgress(
        callback: (data: {
          phase:
            | "listing"
            | "downloading"
            | "completed"
            | "completed_with_errors"
            | "failed";
          done: number;
          processed: number;
          succeeded: number;
          failed: number;
          skipped: number;
          total: number;
          percent: number;
          bytesTransferred: number;
          bytesTotal: number;
          currentFile?: string;
        }) => void
      ): () => void;

      searchTif(nome_arquivo: string): Promise<{
        nomeDescriptografado: string;
        base64: string;
      } | null>;

      searchTifWith30(
        nome_arquivo: string,
        nome_arquivo_30?: string | null,
        nome_arquivo_nacional?: string | null,
        nome_arquivo_rs?: string | null
      ): Promise<{
        principal: {
          nomeOriginal: string;
          base64: string;
        } | null;
        arquivo_30: {
          nomeOriginal: string;
          base64: string;
        } | null;
        nacional: {
          nomeOriginal: string;
          base64: string;
        } | null;
        rs: {
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
