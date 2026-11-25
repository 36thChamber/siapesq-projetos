"use client";

import { useState, ChangeEvent, useMemo } from "react";
import Modal from "./modal";
import { useAuth } from "@/context/AuthContext";
import { criarInformacaoEspecie } from "@/services/api/informacoesEspecies.service";
import { Especie as Specie } from "@/services/types/especie.types";

interface ModalInformacaoEspecieProps {
  isOpen: boolean;
  onClose: () => void;
  grupos: { id: string; nome: string }[];
  especies: Specie[];
}

export default function ModalInformacaoEspecie({
  isOpen,
  onClose,
  grupos,
  especies,
}: ModalInformacaoEspecieProps) {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [selectedGrupoId, setSelectedGrupoId] = useState("");

  const [feedbackModal, setFeedbackModal] = useState({
    isOpen: false,
    type: "success" as "success" | "error",
    message: "",
  });

  const [formData, setFormData] = useState({
    id_especie: "",
    tipo_informacao: "",
    informacao: "",
    fonte_referencia: "",
    link_fonte: "",
    referencia_texto: "",
    referencia_completa: "",
  });

  const especiesFiltradas = useMemo(() => {
    if (!selectedGrupoId) return especies;
    return especies.filter((e) => e.id_gruposespecies === selectedGrupoId);
  }, [selectedGrupoId, especies]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const closeFeedbackModal = () => {
    setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleSave = async () => {
    if (
      !formData.id_especie ||
      !formData.tipo_informacao ||
      !formData.informacao ||
      !formData.fonte_referencia ||
      !formData.link_fonte
    ) {
      setFeedbackModal({
        isOpen: true,
        type: "error",
        message: "Preencha todos os campos obrigatórios (*).",
      });
      return;
    }

    if (!user) {
      setFeedbackModal({
        isOpen: true,
        type: "error",
        message: "Usuário não autenticado.",
      });
      return;
    }

    setLoading(true);

    try {
      await criarInformacaoEspecie(formData);

      setFeedbackModal({
        isOpen: true,
        type: "success",
        message: "Informação adicionada com sucesso!",
      });

      onClose();
    } catch (error) {
      setFeedbackModal({
        isOpen: true,
        type: "error",
        message: "Erro ao salvar. Verifique se os campos estão corretos.",
      });
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left w-full mt-2">
      <h2 className="col-span-full text-xl font-bold text-[#233263] mb-2 border-b pb-2">
        Adicionar Informação
      </h2>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold">Filtrar por Grupo</label>
        <select
          value={selectedGrupoId}
          onChange={(e) => setSelectedGrupoId(e.target.value)}
          className="border p-2 rounded-lg bg-gray-50 outline-none"
        >
          <option value="">Todos os grupos</option>
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold">Espécie *</label>
        <select
          name="id_especie"
          value={formData.id_especie}
          onChange={handleChange}
          className="border p-2 rounded-lg bg-white outline-none"
        >
          <option value="">Selecione a espécie...</option>
          {especiesFiltradas.map((e) => (
            <option key={e.id_especie} value={e.id_especie}>
              {e.nome}
            </option>
          ))}
        </select>
      </div>

      <input
        name="tipo_informacao"
        placeholder="Tipo (ex: Habitat) *"
        value={formData.tipo_informacao}
        onChange={handleChange}
        className="col-span-full border p-2 rounded-lg"
      />

      <textarea
        name="informacao"
        placeholder="Informação *"
        value={formData.informacao}
        onChange={handleChange}
        className="col-span-full border p-2 rounded-lg h-24"
      />

      <input
        name="fonte_referencia"
        placeholder="Fonte da Referência *"
        value={formData.fonte_referencia}
        onChange={handleChange}
        className="border p-2 rounded-lg"
      />

      <input
        name="link_fonte"
        placeholder="Link da Fonte *"
        value={formData.link_fonte}
        onChange={handleChange}
        className="border p-2 rounded-lg"
      />

      <textarea
        name="referencia_texto"
        placeholder="Trecho da Referência"
        value={formData.referencia_texto}
        onChange={handleChange}
        className="col-span-full border p-2 rounded-lg h-16"
      />

      <textarea
        name="referencia_completa"
        placeholder="Referência Completa"
        value={formData.referencia_completa}
        onChange={handleChange}
        className="col-span-full border p-2 rounded-lg h-16"
      />
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        message={formContent}
        buttons={[
          {
            label: "Cancelar",
            onClick: onClose,
            variant: "secondary",
          },
          {
            label: loading ? "Enviando..." : "Salvar Informação",
            onClick: handleSave,
            variant: "primary",
            className: loading ? "opacity-60 cursor-not-allowed" : "",
          },
        ]}
      />

      <Modal
        isOpen={feedbackModal.isOpen}
        onClose={closeFeedbackModal}
        icon={
          feedbackModal.type === "success" ? (
            <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-3xl">
              ✓
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-3xl">
              !
            </div>
          )
        }
        message={
          <p className="text-lg font-semibold">
            {feedbackModal.message}
          </p>
        }
        buttons={[
          {
            label: "OK",
            onClick: closeFeedbackModal,
            variant: feedbackModal.type === "success" ? "primary" : "danger",
          },
        ]}
      />
    </>
  );
}
