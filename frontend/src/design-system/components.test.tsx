// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button, Card, Input, Select, Spinner, Textarea } from "@/design-system";

describe("Button", () => {
  it("is a plain button by default, so it never submits forms by accident", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" }).getAttribute("type")).toBe("button");
  });

  it("runs its click handler", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("while loading: disabled, marked busy and ignores clicks", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveProperty("disabled", true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Input", () => {
  it("is labelled, so it can be found by its label", () => {
    render(<Input label="Display name" />);
    expect(screen.getByLabelText("Display name").tagName).toBe("INPUT");
  });

  it("links its hint for screen readers", () => {
    render(<Input label="Display name" hint="Shown on your portfolio." />);
    const input = screen.getByLabelText("Display name");
    const hintId = input.getAttribute("aria-describedby")!;
    expect(document.getElementById(hintId)?.textContent).toBe("Shown on your portfolio.");
  });

  it("marks itself invalid and announces the error", () => {
    render(<Input label="Username" error="Use letters and numbers." />);
    const input = screen.getByLabelText("Username");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const describedBy = input.getAttribute("aria-describedby")!.split(" ");
    expect(describedBy.map((id) => document.getElementById(id)?.textContent)).toContain(
      "Use letters and numbers.",
    );
  });

  it("passes required through to the control", () => {
    render(<Input label="Title" required />);
    expect(screen.getByLabelText(/Title/)).toHaveProperty("required", true);
  });
});

describe("Textarea", () => {
  it("is labelled and accepts typing", async () => {
    render(<Textarea label="Bio" />);
    const textarea = screen.getByLabelText("Bio");
    await userEvent.type(textarea, "Hello");
    expect(textarea).toHaveProperty("value", "Hello");
  });
});

describe("Select", () => {
  const options = [
    { value: "designer", label: "Designer" },
    { value: "editor", label: "Video editor" },
  ];

  it("lists its options and starts on the placeholder", () => {
    render(<Select label="Profession" placeholder="Choose one" options={options} />);
    const select = screen.getByLabelText("Profession") as HTMLSelectElement;
    expect(select.value).toBe("");
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Choose one",
      "Designer",
      "Video editor",
    ]);
  });

  it("lets a person choose an option", async () => {
    render(<Select label="Profession" options={options} />);
    const select = screen.getByLabelText("Profession") as HTMLSelectElement;
    await userEvent.selectOptions(select, "editor");
    expect(select.value).toBe("editor");
  });
});

describe("Spinner", () => {
  it("announces its label when given one", () => {
    render(<Spinner label="Loading projects" />);
    expect(screen.getByRole("status").textContent).toBe("Loading projects");
  });

  it("is hidden from screen readers without a label", () => {
    const { container } = render(<Spinner />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("Card", () => {
  it("renders its content and passes through attributes", () => {
    render(<Card data-testid="card">Hello</Card>);
    expect(screen.getByTestId("card").textContent).toBe("Hello");
  });
});
