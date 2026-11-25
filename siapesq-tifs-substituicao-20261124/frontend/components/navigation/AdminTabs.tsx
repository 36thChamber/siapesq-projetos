"use client";

type TabType = "users" | "species";

interface AdminTabsProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
}

export default function AdminTabs({ activeTab, onChange }: AdminTabsProps) {
  return (
    <div className="flex gap-4 p-6 justify-center">
      <button
        onClick={() => onChange("users")}
        className={`px-4 py-2 rounded-lg font-semibold transition ${
          activeTab === "users"
            ? "bg-blue-600 text-white"
            : "bg-gray-200 text-gray-700"
        }`}
      >
        Usuários
      </button>

      <button
        onClick={() => onChange("species")}
        className={`px-4 py-2 rounded-lg font-semibold transition ${
          activeTab === "species"
            ? "bg-blue-600 text-white"
            : "bg-gray-200 text-gray-700"
        }`}
      >
        Espécies
      </button>
    </div>
  );
}