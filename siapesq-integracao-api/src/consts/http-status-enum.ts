export default {
    OK: 200, // requisição bem sucedida com retorno (GET, PUT, etc)
    CREATED: 201, // recurso criado com sucesso (POST)
    NO_CONTENT: 204, // sucesso, mas sem retornar nada (DELETE, update sem resposta)
    BAD_REQUEST: 400, // erro genérico do cliente (request mal formada, dados faltando)
    UNAUTHORIZED: 401, // não autenticado (token inválido, ausente ou expirado)
    FORBIDDEN: 403, // autenticado, mas sem permissão para acessar
    NOT_FOUND: 404, // recurso não encontrado (id não existe, rota inválida)
    CONFLICT: 409, // conflito de dados (ex: email já cadastrado)
    UNPROCESSABLE_ENTITY: 422, // erro de validação (dados inválidos, formato errado)
    INTERNAL_ERROR: 500, // erro inesperado no servidor (bug, exception não tratada)
}