"use client";

import { useState } from "react";
import InputDynamic from "./input";
import Button from "./button";
import { CriarGrupoEspeciePayload } from "@/services/types/grupoEspecie.types";

interface CreateGrupoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CriarGrupoEspeciePayload) => void;
}

export default function CreateGrupoModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateGrupoModalProps) {
  const [nome, setNome] = useState("");
  const [quantidade, setQuantidade] = useState("");

  function handleSubmit() {
    if (!nome || !quantidade) return;

    onSubmit({
      nome,
      quantidade: Number(quantidade),
    });

    setNome("");
    setQuantidade("");

    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-lg">
        
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Novo Grupo</h2>

          <button
            className="text-gray-500 hover:text-gray-700 font-bold"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <InputDynamic
            type="text"
            placeholder="Nome do grupo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />

          <InputDynamic
            type="number"
            placeholder="Quantidade de espécies"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={onClose} placeholder="Cancelar" />

          <Button
            onClick={handleSubmit}
            placeholder="Cadastrar"
            disabled={!nome || !quantidade}
          />
        </div>
      </div>
    </div>
  );
}
