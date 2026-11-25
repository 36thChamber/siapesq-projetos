"use client";
import { useId } from "react";
import type { DatasetOption } from "@/utils/analysisDatasets";

export default function DatasetSelector({ options, value, onChange, disabled = false }: {
  options: DatasetOption[]; value: string; onChange: (value: string) => void; disabled?: boolean;
}) {
  const id = useId();
  if (options.length < 2) return null;
  return <div className="my-3 space-y-1">
    <label htmlFor={id} className="block text-xs font-semibold text-slate-700">Conjunto de dados</label>
    <select id={id} value={value} onChange={event => onChange(event.target.value)} disabled={disabled}
      className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-800 disabled:opacity-50">
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </div>;
}
