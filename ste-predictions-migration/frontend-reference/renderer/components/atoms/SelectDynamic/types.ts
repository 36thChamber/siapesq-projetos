export interface Species {
  id: string;
  nome: string;
  nome_cientifico?: string;
  grupo?: string;
  icon?: string;
}

export type SpeciesSelectVariant = 'default' | 'simple';

export interface SpeciesSelectProps {
  options: Species[];
  value?: string;
  onChange?: (species: Species | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;

  triggerIcon?: string;

  count?: number;
  
  variant?: SpeciesSelectVariant;

  showSelectedIcon?: boolean;
}
