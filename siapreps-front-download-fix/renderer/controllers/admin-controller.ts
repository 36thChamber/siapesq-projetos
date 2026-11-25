import axios from "axios"
import { BASE_API } from "../../resources/BASE_API"

export async function admin_aprovar_usuario(body: {
    id_usuario: number | string
    status: string
    token: string
}) {
    try {
        const { token, ...data } = body

        const response = await axios.put(
            `${BASE_API}/siapesq/admin/aprovar-usuario`,
            data,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        )

        console.log("Resposta da aprovação do usuário:", response.data)
        return response.data

    } catch (error) {
        console.log("Erro ao aprovar usuário:", error)
        throw error
    }
}

export async function admin_buscar_usuarios(params: {
    token: string
    q?: string
    status?: string
    page?: number
    pageSize?: number
}) {
    try {
        const { token, ...query } = params

        const response = await axios.get(
            `${BASE_API}/siapesq/admin/buscar-usuario`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                params: query
            }
        )

        console.log("Resposta da busca de usuários (admin):", response.data)
        return response.data

    } catch (error) {
        console.log("Erro ao buscar usuários (admin):", error)
        throw error
    }
}

export async function admin_buscar_especie(params: {
    token: string
    q: string
}) {
    try {
        const { token, q } = params

        const response = await axios.get(
            `${BASE_API}/siapesq/admin/buscar-especie`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                params: { q }
            }
        )

        console.log("Resposta da busca de espécies (admin):", response.data)
        return response.data

    } catch (error) {
        console.log("Erro ao buscar espécies (admin):", error)
        throw error
    }
}
