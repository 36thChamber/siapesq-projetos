//função usada para verificar conexao de internet do usuario
//tem acessar o google, se acessar tem internet se nao retorna false

export const checarConexaoInternet = async () => {
    try {
      const response = await fetch('https://www.google.com', {
        method: 'HEAD', 
        mode: 'no-cors', 
      });
      
      return response && response.status >= 200 && response.status < 500;
    } catch (error) {
      return false;
    }
  };
  