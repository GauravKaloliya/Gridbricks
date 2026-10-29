import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { GUIDE_STEPS } from "../lib/guide";

interface GuideContextValue {
  isGuideOpen: boolean;
  stepIndex: number;
  stepCount: number;
  startGuide: () => void;
  exitGuide: () => void;
  nextStep: () => void;
  previousStep: () => void;
}

const GuideContext = createContext<GuideContextValue | null>(null);

export function GuideProvider({ children }: { children: ReactNode }) {
  const [isGuideOpen, setGuideOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const startGuide = useCallback(() => {
    setStepIndex(0);
    setGuideOpen(true);
  }, []);

  const exitGuide = useCallback(() => {
    setGuideOpen(false);
    setStepIndex(0);
  }, []);

  const nextStep = useCallback(() => {
    setStepIndex((index) => {
      if (index >= GUIDE_STEPS.length - 1) {
        setGuideOpen(false);
        return 0;
      }
      return index + 1;
    });
  }, []);

  const previousStep = useCallback(() => {
    setStepIndex((index) => Math.max(0, index - 1));
  }, []);

  const value = useMemo(
    () => ({
      isGuideOpen,
      stepIndex,
      stepCount: GUIDE_STEPS.length,
      startGuide,
      exitGuide,
      nextStep,
      previousStep,
    }),
    [
      isGuideOpen,
      stepIndex,
      startGuide,
      exitGuide,
      nextStep,
      previousStep,
    ],
  );

  return (
    <GuideContext.Provider value={value}>{children}</GuideContext.Provider>
  );
}

export function useGuide(): GuideContextValue {
  const value = useContext(GuideContext);
  if (!value) {
    throw new Error("useGuide must be used inside a GuideProvider");
  }
  return value;
}
