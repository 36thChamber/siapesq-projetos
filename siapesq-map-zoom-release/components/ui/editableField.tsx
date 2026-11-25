import { useState, useRef, useEffect } from "react";
import { EditIcon } from "@/components/icons";
import { EditableUserFields } from "@/services/types/usuario.types";

interface EditableFieldProps {
  label: string;
  value: string;
  field: EditableUserFields;
  type?: string;
  onSave: (
    field: EditableUserFields,
    value: string
  ) => Promise<void> | void;
}

export default function EditableField({
  label,
  value,
  field,
  type = "text",
  onSave,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  async function handleSave() {
    if (internalValue !== value) {
      await onSave(field, internalValue);
    }
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleSave();
    }

    if (e.key === "Escape") {
      setInternalValue(value);
      setIsEditing(false);
    }
  }

  return (
    <div className="flex items-center gap-3 flex-[1_1_40%]">
      <span className="text-sm text-gray-500 whitespace-nowrap">{label}:</span>

      {isEditing ? (
        <input
          ref={inputRef}
          type={type}
          value={internalValue}
          onChange={(e) => setInternalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <div className="flex items-center gap-2 group cursor-pointer w-full" onClick={() => setIsEditing(true)}>
          <span className="text-base">
            {value || "Não informado"}
          </span>

          <EditIcon
            size={16}
            className="opacity-0 group-hover:opacity-100 transition"
          />
        </div>
      )}
    </div>
  );
}
