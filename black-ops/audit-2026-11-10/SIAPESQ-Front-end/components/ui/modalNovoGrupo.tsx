"use client";

import { useState, ChangeEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { criarGrupoEspecie } from "@/services/api/gruposEspecies.service";
import { CriarGrupoEspeciePayload } from "@/services/types/grupoEspecie.types";
import Button from "./button";

type ApiError = {
  response?: {
    data?: {
      error?: string;
      message?: string;
    };
  };
};

interface ModalNovoGrupoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (novoGrupo: { id: string; id_gruposespecies: string; nome: string }) => void;
}

export default function ModalNovoGrupo({ isOpen, onClose, onSuccess }: ModalNovoGrupoProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nome: "",
    quantidade: "0",
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setError(null);

    if (!formData.nome.trim()) {
      setError("O nome do grupo é obrigatório.");
      return;
    }

    const qtdNumero = parseInt(formData.quantidade, 10);
    if (isNaN(qtdNumero) || qtdNumero < 0) {
      setError("A quantidade deve ser um número maior ou igual a 0.");
      return;
    }

    setLoading(true);

    try {
      const payload: CriarGrupoEspeciePayload = {
        nome: formData.nome.trim(),
        quantidade: qtdNumero,
      };

      const result = await criarGrupoEspecie(payload);


      const uuidDoBanco = result.id_gruposespecies;


      onSuccess({
        id: uuidDoBanco, 
        id_gruposespecies: uuidDoBanco,
        nome: payload.nome,
      });

      setFormData({ nome: "", quantidade: "0" });
      onClose();
    } catch (err: unknown) {
      console.error(err);
      const apiError = err as ApiError;
      setError(
        apiError.response?.data?.error ??
          apiError.response?.data?.message ??
          "Erro ao criar o grupo.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#233263]">Adicionar Novo Grupo</h2>
          <button className="text-gray-500 hover:text-gray-700 font-bold text-xl" onClick={onClose}>
            &times;
          </button>
        </div>

        {error && (
          <p className="text-sm bg-red-50 text-red-600 p-2 rounded border border-red-200 mb-4">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 text-left">
            <label className="text-sm font-semibold text-gray-700">Nome do Grupo *</label>
            <input
              name="nome"
              type="text"
              placeholder="Ex: Mamíferos"
              value={formData.nome}
              onChange={handleChange}
              className="border rounded-lg px-3 py-2 outline-none w-full"
            />
          </div>

          <div className="flex flex-col gap-1 text-left">
            <label className="text-sm font-semibold text-gray-700">Quantidade de Espécies *</label>
            <input
              name="quantidade"
              type="number"
              min="0"
              value={formData.quantidade}
              onChange={handleChange}
              className="border rounded-lg px-3 py-2 outline-none w-full"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={onClose} placeholder={"Cancelar"} />
          <Button
            onClick={handleSave}
            placeholder={loading ? "Salvando..." : "Salvar Grupo"}
            disabled={loading || !formData.nome}
          />
        </div>
      </div>
    </div>
  );
}
