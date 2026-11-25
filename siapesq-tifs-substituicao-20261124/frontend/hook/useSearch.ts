import { useEffect, useState } from "react";

interface UseSearchProps {
  initialValue?: string;
  onSearch?: (query: string) => void | Promise<void>;
  debounceTime?: number;
}

export function useSearch({
  initialValue = "",
  onSearch,
  debounceTime = 300,
}: UseSearchProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (!onSearch) return;

    const handler = setTimeout(() => {
      onSearch(value);
    }, debounceTime);

    return () => clearTimeout(handler);
  }, [value, onSearch, debounceTime]);

  return {
    value,
    setValue,
  };
}
