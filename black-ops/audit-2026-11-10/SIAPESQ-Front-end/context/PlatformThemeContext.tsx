"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

import {
  getPlatformTheme,
  platformThemes,
  PlatformState,
  PlatformTheme,
} from "@/config/platformThemes";

const STORAGE_KEY = "platformState";
export const DEFAULT_STATE: PlatformState = "RS";

const isValidState = (value: unknown): value is PlatformState =>
  typeof value === "string" && value in platformThemes;

type PlatformThemeContextType = {
  selectedState: PlatformState;
  theme: PlatformTheme;
  setSelectedState: (state: PlatformState) => void;
};

const PlatformThemeContext = createContext<PlatformThemeContextType | undefined>(
  undefined,
);

type Props = {
  children: ReactNode;
  userPreferredState?: PlatformState | null;
};

export const PlatformThemeProvider = ({
  children,
  userPreferredState,
}: Props) => {
  const [selectedState, setSelectedStateRaw] = useState<PlatformState>(
    userPreferredState && isValidState(userPreferredState)
      ? userPreferredState
      : DEFAULT_STATE,
  );

  useEffect(() => {
    if (userPreferredState && isValidState(userPreferredState)) {
      setSelectedStateRaw(userPreferredState);
      localStorage.setItem(STORAGE_KEY, userPreferredState);
      return;
    }

    const stored = localStorage.getItem(STORAGE_KEY);

    if (isValidState(stored)) {
      setSelectedStateRaw(stored);
    }
  }, [userPreferredState]);

  const setSelectedState = (state: PlatformState) => {
    setSelectedStateRaw(state);
    localStorage.setItem(STORAGE_KEY, state);
  };

  const theme = useMemo(() => {
    return getPlatformTheme(selectedState);
  }, [selectedState]);

  return (
    <PlatformThemeContext.Provider
      value={{
        selectedState,
        theme,
        setSelectedState,
      }}
    >
      {children}
    </PlatformThemeContext.Provider>
  );
};

export const usePlatformTheme = (): PlatformThemeContextType => {
  const ctx = useContext(PlatformThemeContext);

  if (!ctx) {
    throw new Error(
      "usePlatformTheme deve estar dentro de PlatformThemeProvider",
    );
  }

  return ctx;
};