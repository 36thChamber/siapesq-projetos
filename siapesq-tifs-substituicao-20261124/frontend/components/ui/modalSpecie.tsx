"use client";

import { useState, ChangeEvent } from "react";
import InputDynamic from "./input";
import Button from "./button";
import ModalNovoGrupo from "./modalNovoGrupo"; 
import { CriarEspeciePayload } from "@/services/types/especie.types";

interface Group {
  id: string;
  nome: string;
}

interface CreateSpecieModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CriarEspeciePayload) => void;
  groups: Group[];
}

export default function CreateSpecieModal({
  isOpen,
  onClose,
  onSubmit,
  groups,
}: CreateSpecieModalProps) {
  const [nome, setNome] = useState("");
  const [nomeCientifico, setNomeCientifico] = useState("");
  const [pesquisador, setPesquisador] = useState("");
  const [grupoId, setGrupoId] = useState("");

  const [createdGroups, setCreatedGroups] = useState<Group[]>([]);
  const listaGrupos = [...groups, ...createdGroups.filter(group => !groups.some(existing => existing.id === group.id))];
  const [isNovoGrupoOpen, setIsNovoGrupoOpen] = useState(false);




  function handleSubmit() {
    if (!nome || !nomeCientifico || !grupoId || !pesquisador) return;

    onSubmit({
      nome,
      nome_cientifico: nomeCientifico,
      pesquisador,
      id_gruposespecies: grupoId,
    });

    setNome("");
    setNomeCientifico("");
    setPesquisador("");
    setGrupoId("");

    onClose();
  }

  const handleSelectGrupoChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "_new_group_") {
      setIsNovoGrupoOpen(true);
    } else {
      setGrupoId(value);
    }
  };


  const handleNovoGrupoCriado = (novoGrupo: Group) => {
    setCreatedGroups((prev) => [...prev, novoGrupo]);
    setGrupoId(novoGrupo.id); 
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">

            <h2 className="text-xl font-semibold mb-4">Nova Espécie</h2>

            <button
              className="text-gray-500 hover:text-gray-700 transition-colors font-bold"
              onClick={onClose}
            >
              &times;
            </button>
          </div>
          <div className="flex flex-col gap-4">
            <InputDynamic
              type="text"
              placeholder="Nome da espécie"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />

            <InputDynamic
              type="text"
              placeholder="Nome científico"
              value={nomeCientifico}
              onChange={(e) => setNomeCientifico(e.target.value)}
            />


            <InputDynamic
              type="text"
              placeholder="Pesquisador"
              value={pesquisador}
              onChange={(e) => setPesquisador(e.target.value)}
            />

            <select
              value={grupoId}
              onChange={handleSelectGrupoChange}
              className="border rounded-lg px-3 py-2 bg-white outline-none w-full"
            >
              <option value="">Selecione um grupo</option>
              {listaGrupos.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.nome}
                </option>
              ))}
            
              <option value="_new_group_" className="text-blue-600 font-semibold bg-blue-50">
                + Adicionar novo grupo
              </option>
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              onClick={onClose}
              placeholder={"Cancelar"}
            ></Button>

            <Button
              onClick={handleSubmit}
              placeholder={"Cadastrar"}
              disabled={!nome || !nomeCientifico || !grupoId || !pesquisador}
            ></Button>
          </div>
        </div>
      </div>

      <ModalNovoGrupo
        isOpen={isNovoGrupoOpen}
        onClose={() => setIsNovoGrupoOpen(false)}
        onSuccess={handleNovoGrupoCriado}
      />
    </>
  );
}
