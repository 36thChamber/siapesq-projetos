"use client";

import { useState } from "react";
import Categories from "@/components/categories";
import { SearchBar } from "@/components/searchBar";
import SpecieTable from "@/components/specieList/specieTable";
import { useSpecieAdmin } from "@/hook/useSpeciesAdmin";
import CreateSpecieModal from "@/components/ui/modalSpecie";
import CreateGrupoModal from "@/components/ui/modalGrupos";
import ModalInformacaoEspecie from "@/components/ui/modalInformacaoEspecie"; 
import { useAuth } from "@/context/AuthContext"; 

// 1. O Componente principal apenas checa a permissão
export default function SpeciesSection() {
  const { user } = useAuth();

  if (!user || user.tipo_usuario !== "ADMIN") {
    return <div className="p-6 text-center text-red-500">Acesso negado.</div>;
  }

  return <SpeciesSectionContent />;
}


function SpeciesSectionContent() {
  const {
    filteredUsers,
    loading,
    error,
    search,
    setSearch,
    handleSearch,
    groups,
    addSpecie,
    addGrupo,
  } = useSpecieAdmin(); // Só vai rodar se for ADMIN

  const [isModalSpecieOpen, setIsModalSpecieOpen] = useState(false);
  const [isGrupoModalOpen, setIsGrupoModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false); 

  return (
    <div className="flex flex-col h-full w-full max-w-7xl mx-auto p-6 bg-white rounded-2xl shadow-md">
      <div className="mb-4">
        <Categories />
      </div>
      <div className="mb-4 flex justify-end items-center gap-3">
        <button
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          onClick={() => setIsGrupoModalOpen(true)}
        >
          Cadastrar Grupo
        </button>

        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          onClick={() => setIsInfoModalOpen(true)}
        >
          Adicionar Informação
        </button>

        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          onClick={() => setIsModalSpecieOpen(true)}
        >
          Cadastrar Espécie
        </button>
      </div>

      <h1 className="text-2xl font-semibold mb-4 text-gray-800">
        Lista de Espécies
      </h1>

      <div className="mb-4 flex-shrink-0">
        <SearchBar
          placeholder="Pesquisar espécie..."
          value={search}
          onChange={(value) => {
            setSearch(value);
            handleSearch(value);
          }}
        />
      </div>

      {loading && (
        <div className="p-6 text-center text-gray-500 animate-pulse">
          Carregando espécies...
        </div>
      )}

      {error && (
        <div className="p-6 text-center text-red-500 font-medium">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="flex-1 min-h-0">
          <SpecieTable species={filteredUsers} />
        </div>
      )}

      <CreateSpecieModal
        isOpen={isModalSpecieOpen}
        onClose={() => setIsModalSpecieOpen(false)}
        onSubmit={(data) => addSpecie(data)}
        groups={groups}
      />

      <CreateGrupoModal
        isOpen={isGrupoModalOpen}
        onClose={() => setIsGrupoModalOpen(false)}
        onSubmit={(data) => addGrupo(data)}
      />

      <ModalInformacaoEspecie 
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        grupos={groups}
        especies={filteredUsers}
      />
    </div>
  );
}