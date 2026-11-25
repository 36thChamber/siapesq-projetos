"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  ReactNode,
} from "react";

import {
  getPlatformTheme,
  platformThemes,
  PlatformState,
  PlatformTheme,
} from "@/config/platformThemes";

import { useStoredString, setStoredString } from "@/hook/useStoredString";

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
  const stored = useStoredString(STORAGE_KEY, DEFAULT_STATE);
  const selectedState = userPreferredState && isValidState(userPreferredState) ? userPreferredState : isValidState(stored) ? stored : DEFAULT_STATE;
  useEffect(() => {
    if (userPreferredState && isValidState(userPreferredState)) setStoredString(STORAGE_KEY, userPreferredState);
  }, [userPreferredState]);
  const setSelectedState = (state: PlatformState) => setStoredString(STORAGE_KEY, state);

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