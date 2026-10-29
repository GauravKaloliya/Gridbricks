import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { ThemeDialog } from "./ThemeDialog";
import {
  THEME_STORAGE_KEY,
  ThemeProvider,
  useTheme,
} from "./ThemeContext";

function Probe() {
  const { theme, isThemeDialogOpen, openThemeDialog } = useTheme();
  return (
    <div>
      <output data-testid="theme">{theme}</output>
      <output data-testid="dialog-open">
        {String(isThemeDialogOpen)}
      </output>
      <button type="button" onClick={openThemeDialog}>
        Open appearance
      </button>
    </div>
  );
}

function renderTheme() {
  return render(
    <ThemeProvider>
      <Probe />
      <ThemeDialog />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.documentElement.style.colorScheme = "";
});

describe("theme provider", () => {
  it("asks on the first visit and persists the chosen theme", async () => {
    const user = userEvent.setup();
    renderTheme();

    expect(
      screen.getByRole("dialog", { name: "Choose how Gridbricks looks" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("theme")).toHaveTextContent("paper");

    await user.click(screen.getByRole("radio", { name: /^Light/ }));
    expect(document.documentElement.dataset.theme).toBe("light");

    await user.click(
      screen.getByRole("button", { name: "Continue with Light" }),
    );
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(
      screen.queryByRole("dialog", { name: "Choose how Gridbricks looks" }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
  });

  it("restores a stored theme without asking again", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
    renderTheme();

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(screen.getByTestId("dialog-open")).toHaveTextContent("false");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(
      screen.queryByRole("dialog", { name: "Choose how Gridbricks looks" }),
    ).not.toBeInTheDocument();
  });

  it("reverts an escaped preview and leaves no stored choice", async () => {
    const user = userEvent.setup();
    renderTheme();

    await user.click(screen.getByRole("radio", { name: /^Dark/ }));
    expect(document.documentElement.dataset.theme).toBe("dark");

    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("dialog", { name: "Choose how Gridbricks looks" }),
    ).not.toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe("paper");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});
