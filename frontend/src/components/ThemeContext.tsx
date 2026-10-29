import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeName = "paper" | "light" | "dark";

export const THEME_STORAGE_KEY = "gridbricks.theme";

export const THEME_OPTIONS: Array<{
  id: ThemeName;
  label: string;
  description: string;
  note: string;
}> = [
  {
    id: "paper",
    label: "Paper",
    description: "Warm editorial paper",
    note: "The original look: warm stock, dark ink, vermilion accents.",
  },
  {
    id: "light",
    label: "Light",
    description: "Clean neutral white",
    note: "The same layout on bright white with cooler grey rules.",
  },
  {
    id: "dark",
    label: "Dark",
    description: "Low-light charcoal",
    note: "A dark reading surface with brighter chart accents.",
  },
];

export const THEME_BASE_COLOR: Record<ThemeName, string> = {
  paper: "#f4f1e9",
  light: "#ffffff",
  dark: "#121211",
};

export interface ChartPalette {
  ink: string;
  inkSoft: string;
  inkMute: string;
  paperRaised: string;
  actual: string;
  signal: string;
  grid: string;
  axisLine: string;
  cursorFill: string;
  cursorLine: string;
  reference: string;
}

export const CHART_PALETTES: Record<ThemeName, ChartPalette> = {
  paper: {
    ink: "#17150f",
    inkSoft: "#464339",
    inkMute: "#6b665a",
    paperRaised: "#fbf9f3",
    actual: "#1b5e57",
    signal: "#c6431e",
    grid: "rgba(23,21,15,0.14)",
    axisLine: "rgba(23,21,15,0.25)",
    cursorFill: "rgba(23,21,15,0.05)",
    cursorLine: "rgba(23,21,15,0.3)",
    reference: "rgba(23,21,15,0.55)",
  },
  light: {
    ink: "#101114",
    inkSoft: "#3f424a",
    inkMute: "#666b74",
    paperRaised: "#f7f7f8",
    actual: "#125e56",
    signal: "#c6431e",
    grid: "rgba(16,17,20,0.14)",
    axisLine: "rgba(16,17,20,0.25)",
    cursorFill: "rgba(16,17,20,0.05)",
    cursorLine: "rgba(16,17,20,0.3)",
    reference: "rgba(16,17,20,0.55)",
  },
  dark: {
    ink: "#edeae1",
    inkSoft: "#c6c2b7",
    inkMute: "#989287",
    paperRaised: "#1b1b19",
    actual: "#63c4b6",
    signal: "#e86a42",
    grid: "rgba(237,234,225,0.14)",
    axisLine: "rgba(237,234,225,0.25)",
    cursorFill: "rgba(237,234,225,0.07)",
    cursorLine: "rgba(237,234,225,0.3)",
    reference: "rgba(237,234,225,0.5)",
  },
};

function isThemeName(value: string | null): value is ThemeName {
  return value === "paper" || value === "light" || value === "dark";
}

function readStoredTheme(): ThemeName | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeName(stored) ? stored : null;
  } catch {
    return null;
  }
}

function applyTheme(theme: ThemeName) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme === "dark" ? "dark" : "light";
  root.style.backgroundColor = THEME_BASE_COLOR[theme];
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", THEME_BASE_COLOR[theme]);
  }
}

interface ThemeContextValue {
  theme: ThemeName;
  committedTheme: ThemeName;
  isThemeDialogOpen: boolean;
  openThemeDialog: () => void;
  closeThemeDialog: () => void;
  previewTheme: (theme: ThemeName) => void;
  confirmTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [committedTheme, setCommittedTheme] = useState<ThemeName>(
    () => readStoredTheme() ?? "paper",
  );
  const [theme, setTheme] = useState<ThemeName>(committedTheme);
  const [isThemeDialogOpen, setThemeDialogOpen] = useState<boolean>(
    () => readStoredTheme() === null,
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY) return;
      const next = isThemeName(event.newValue) ? event.newValue : "paper";
      setCommittedTheme(next);
      setTheme(next);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const openThemeDialog = useCallback(() => setThemeDialogOpen(true), []);

  const closeThemeDialog = useCallback(() => {
    setTheme(committedTheme);
    setThemeDialogOpen(false);
  }, [committedTheme]);

  const previewTheme = useCallback((next: ThemeName) => {
    setTheme(next);
  }, []);

  const confirmTheme = useCallback((next: ThemeName) => {
    setCommittedTheme(next);
    setTheme(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* The choice still applies for this visit. */
    }
    setThemeDialogOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      committedTheme,
      isThemeDialogOpen,
      openThemeDialog,
      closeThemeDialog,
      previewTheme,
      confirmTheme,
    }),
    [
      theme,
      committedTheme,
      isThemeDialogOpen,
      openThemeDialog,
      closeThemeDialog,
      previewTheme,
      confirmTheme,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used inside a ThemeProvider");
  }
  return value;
}

export function useChartPalette(): ChartPalette {
  return CHART_PALETTES[useTheme().theme];
}
