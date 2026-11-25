"use client";
import { useAuth } from "@/context/AuthContext";
import ProfileHeader from "./ProfileHeader";
import UserDataForm from "./UserDataForm";

export default function ProfileSection() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    // Removido o Header daqui (ele agora está no pai)
    // Este container apenas empilha os dois cards do perfil
    <div className="w-full flex flex-col gap-6">
      <ProfileHeader user={user} />
      <UserDataForm user={user} />
    </div>
  );
}