"use client";
import { createContext, useContext } from "react";
const TestEnvironmentContext = createContext(false);
export function TestEnvironmentProvider({ testMode, children }: { testMode: boolean; children: React.ReactNode }) {
  return <TestEnvironmentContext.Provider value={testMode}>{children}</TestEnvironmentContext.Provider>;
}
export const useTestEnvironment = () => useContext(TestEnvironmentContext);
