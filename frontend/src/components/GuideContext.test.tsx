import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { GUIDE_STEPS } from "../lib/guide";
import { GuideProvider, useGuide } from "./GuideContext";

function Probe() {
  const guide = useGuide();
  return (
    <div>
      <output data-testid="open">{String(guide.isGuideOpen)}</output>
      <output data-testid="step">{guide.stepIndex}</output>
      <output data-testid="count">{guide.stepCount}</output>
      <button type="button" onClick={guide.startGuide}>
        Start
      </button>
      <button type="button" onClick={guide.nextStep}>
        Next
      </button>
      <button type="button" onClick={guide.previousStep}>
        Previous
      </button>
      <button type="button" onClick={guide.exitGuide}>
        Exit
      </button>
    </div>
  );
}

function renderGuide() {
  return render(
    <GuideProvider>
      <Probe />
    </GuideProvider>,
  );
}

describe("guide provider", () => {
  it("starts at the first step and clamps navigation at both ends", async () => {
    const user = userEvent.setup();
    renderGuide();

    expect(screen.getByTestId("open")).toHaveTextContent("false");
    expect(screen.getByTestId("count")).toHaveTextContent(
      String(GUIDE_STEPS.length),
    );

    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(screen.getByTestId("open")).toHaveTextContent("true");
    expect(screen.getByTestId("step")).toHaveTextContent("0");

    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByTestId("step")).toHaveTextContent("0");

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByTestId("step")).toHaveTextContent("1");

    await user.click(screen.getByRole("button", { name: "Exit" }));
    expect(screen.getByTestId("open")).toHaveTextContent("false");
    expect(screen.getByTestId("step")).toHaveTextContent("0");
  });

  it("closes and resets after the final step", async () => {
    const user = userEvent.setup();
    renderGuide();
    await user.click(screen.getByRole("button", { name: "Start" }));

    for (let index = 0; index < GUIDE_STEPS.length; index += 1) {
      await user.click(screen.getByRole("button", { name: "Next" }));
    }

    expect(screen.getByTestId("open")).toHaveTextContent("false");
    expect(screen.getByTestId("step")).toHaveTextContent("0");
  });
});
