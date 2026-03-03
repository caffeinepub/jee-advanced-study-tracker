import type React from "react";
import { createContext, useContext, useState } from "react";

interface RealityModeContextType {
  isRealityModeActive: boolean;
  toggleRealityMode: () => void;
  setRealityMode: (active: boolean) => void;
}

const RealityModeContext = createContext<RealityModeContextType | undefined>(
  undefined,
);

export function RealityModeProvider({
  children,
}: { children: React.ReactNode }) {
  const [isRealityModeActive, setIsRealityModeActive] = useState(false);

  const toggleRealityMode = () => setIsRealityModeActive((prev) => !prev);
  const setRealityMode = (active: boolean) => setIsRealityModeActive(active);

  return (
    <RealityModeContext.Provider
      value={{ isRealityModeActive, toggleRealityMode, setRealityMode }}
    >
      {children}
    </RealityModeContext.Provider>
  );
}

export function useRealityMode() {
  const ctx = useContext(RealityModeContext);
  if (!ctx)
    throw new Error("useRealityMode must be used within RealityModeProvider");
  return ctx;
}
