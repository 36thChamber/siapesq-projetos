"use client";

import { useState, useEffect } from "react";
import { Edit2, Check, X } from "lucide-react";
import CardInfoPerfil from "../atoms/cardinfoperfil";
import { update_usuario } from "../../controllers/usuarios-controllers";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast"; 

export default function ProfilePage() {
  const { user, setUser , loading: authLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState(user);

  if (!userData) {
  return <div>Carregando...</div>;
}

  useEffect(() => {
    setUserData(user);
  }, [user]);

  if (authLoading || !user) return <p>Carregando perfil...</p>;

  const profileFields = [
    { label: "Nome", key: "nome", value: userData.nome },
    { label: "E-mail", key: "email", value: userData.email },
    { label: "CPF", key: "cpf", value: userData.cpf || "" },
    { label: "Contato", key: "contato", value: userData.contato || "" },
  ];

  const handleChangeField = (key: string, value: string) => {
    setUserData((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  const handleSave = async () => {
    if (!userData) return;

    const token = await window.auth.getToken();
    if (!token)  {
      toast.error("Você não está autenticado!");
      return;
    }

    const payload: any = {
      id_usuario: user.id_usuario,
      token: token,
    };

    if (userData.nome !== user.nome) payload.nome = userData.nome;
    if (userData.email !== user.email) payload.email = userData.email;
    if (userData.cpf !== user.cpf) payload.cpf = userData.cpf;
    if (userData.contato !== user.contato) payload.contato = userData.contato;
    if (userData.titulo_cientifico !== user.titulo_cientifico)
      payload.titulo_cientifico = userData.titulo_cientifico;

    if (Object.keys(payload).length <= 2) {
      toast("Nenhuma alteração feita", { icon: "ℹ️" });
      setIsEditing(false);
      return;
    }

    const updated = await update_usuario(payload);


    if (updated) {
      const newUser = { ...user, ...payload };
      setUser(newUser);
      await window.auth.setUserData(newUser);

      toast.success("Informações atualizadas com sucesso! ");
    } else {
      toast.error("Erro ao atualizar os dados. Tente novamente.");
    }

    setIsEditing(false);
  };



  const handleCancel = () => {
    setUserData(user);
    setIsEditing(false);
    toast("Alterações canceladas", { icon: "❌" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <img
          src="/images/logos/SIAPESQ3.png"
          alt="User avatar"
          className="w-20 h-20 rounded-full object-cover"
        />
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{userData.nome}</h1>
        </div>
      </div>

      <div className="bg-dark_green rounded-lg p-6 text-teal-50">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Informações do perfil</h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-light_green hover:text-light_green transition-colors"
              >
                <Edit2 size={20} />
              </button>
            )}

            {isEditing && (
              <>
                <button
                  onClick={handleSave}
                  className="bg-teal-600 hover:bg-teal-500 text-light_green 
                           rounded px-3 py-1 flex items-center gap-1 text-sm"
                >
                  <Check size={15} /> Salvar
                </button>

                <button
                  onClick={handleCancel}
                  className="bg-teal-600 hover:bg-teal-500 text-light_green 
                           rounded px-3 py-1 flex items-center gap-1 text-sm"
                >
                  <X size={15} /> Cancelar
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {profileFields.map((field) => (
            <CardInfoPerfil
              key={field.key}
              label={field.label}
              value={String(field.value)}
              isEditing={isEditing}
              onChange={(v) => handleChangeField(field.key, v)}
            />
          ))}
        </div>
      </div>

      <div className="bg-dark_green rounded-lg p-6 text-teal-50">
        <h2 className="text-xl font-semibold mb-6">Acessos disponível</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-light_green font-semibold mb-3">Grupos disponíveis</h3>
            <div className="flex flex-wrap gap-2">
              <span className="bg-teal-600 text-light_green px-3 py-1 rounded text-sm">
                Primatas
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-light_green font-semibold mb-3">Número de ocorrências</h3>
            <div className="flex flex-wrap gap-2">
              <span className="bg-teal-600 text-light_green px-3 py-1 rounded text-sm">
                8.403
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
