import { SearchIcon } from "@/components/icons";

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({
  placeholder = "Pesquisar...",
  value,
  onChange,
}: SearchBarProps) {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <SearchIcon size={18} className="opacity-70" />
      </div>

      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2784BE]"
      />
    </div>
  );
}
