// @vitest-environment jsdom
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Input } from "@/design-system";
import {
  Drawer,
  ModalShell,
  OverlayProvider,
  useModal,
  useToast,
  type ModalApi,
  type ToastApi,
} from "@/overlays";

/** Renders the providers and hands back the modal/toast APIs for the test to drive. */
function renderWithOverlays() {
  const api: { modal?: ModalApi; toast?: ToastApi } = {};
  function Capture() {
    api.modal = useModal();
    api.toast = useToast();
    return <button type="button">Outside</button>;
  }
  render(
    <OverlayProvider>
      <Capture />
    </OverlayProvider>,
  );
  return api as { modal: ModalApi; toast: ToastApi };
}

describe("ModalShell", () => {
  function Example({ dismissible = true }: { dismissible?: boolean }) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Open
        </button>
        <ModalShell
          open={open}
          onOpenChange={setOpen}
          title="Edit profile"
          description="Update your details."
          dismissible={dismissible}
        >
          <input aria-label="Name" />
        </ModalShell>
      </>
    );
  }

  it("opens as an accessible dialog with its title and description", async () => {
    render(<Example />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog", { name: "Edit profile" });
    expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByText("Update your details.")).toBeTruthy();
  });

  it("moves focus inside and returns it to the trigger when closed with Escape", async () => {
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Open" });
    await userEvent.click(trigger);
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("closes from the close button", async () => {
    render(<Example />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("can't be dismissed while locked (e.g. during a save)", async () => {
    render(<Example dismissible={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Close" })).toHaveProperty("disabled", true);
  });
});

describe("Drawer", () => {
  it("is a dialog with the same behaviour as a modal", async () => {
    const onOpenChange = vi.fn();
    render(<Drawer open onOpenChange={onOpenChange} title="Settings" />);
    expect(screen.getByRole("dialog", { name: "Settings" })).toBeTruthy();
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("modal.confirm", () => {
  it("resolves true when confirmed", async () => {
    const { modal } = renderWithOverlays();
    let result: Promise<boolean>;
    act(() => {
      result = modal.confirm({ title: "Publish?", confirmLabel: "Publish" });
    });
    await userEvent.click(await screen.findByRole("button", { name: "Publish" }));
    await expect(result!).resolves.toBe(true);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("resolves false when cancelled or dismissed with Escape", async () => {
    const { modal } = renderWithOverlays();
    let cancelled: Promise<boolean>;
    act(() => {
      cancelled = modal.confirm({ title: "Publish?" });
    });
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await expect(cancelled!).resolves.toBe(false);

    let escaped: Promise<boolean>;
    act(() => {
      escaped = modal.confirm({ title: "Publish again?" });
    });
    await screen.findByRole("dialog", { name: "Publish again?" });
    await userEvent.keyboard("{Escape}");
    await expect(escaped!).resolves.toBe(false);
  });

  it("returns focus to the button that opened it, even when opened from code", async () => {
    function Opener() {
      const modal = useModal();
      return (
        <button type="button" onClick={() => void modal.confirm({ title: "Publish?" })}>
          Publish portfolio
        </button>
      );
    }
    render(
      <OverlayProvider>
        <Opener />
      </OverlayProvider>,
    );
    const opener = screen.getByRole("button", { name: "Publish portfolio" });
    await userEvent.click(opener);
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it("for dangerous actions, focuses Cancel first", async () => {
    const { modal } = renderWithOverlays();
    act(() => {
      void modal.confirm({ title: "Delete?", tone: "danger", confirmLabel: "Delete" });
    });
    await screen.findByRole("dialog");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
  });

  it("shows loading while working, then an error and stays open if it fails", async () => {
    const { modal } = renderWithOverlays();
    let attempt = 0;
    let finish: () => void = () => {};
    let result: Promise<boolean>;
    act(() => {
      result = modal.confirm({
        title: "Delete?",
        confirmLabel: "Delete",
        onConfirm: () =>
          new Promise<void>((resolve, reject) => {
            attempt += 1;
            finish = attempt === 1 ? () => reject(new Error("Server unavailable.")) : resolve;
          }),
      });
    });

    const confirm = await screen.findByRole("button", { name: "Delete" });
    await userEvent.click(confirm);
    expect(confirm.getAttribute("aria-busy")).toBe("true");
    await act(async () => finish());

    expect((await screen.findByRole("alert")).textContent).toBe("Server unavailable.");
    expect(screen.getByRole("dialog")).toBeTruthy();

    await userEvent.click(confirm);
    await act(async () => finish());
    await expect(result!).resolves.toBe(true);
  });
});

describe("modal.form", () => {
  function openProjectForm(modal: ModalApi, onSubmit = vi.fn(async (v) => v.title)) {
    let result: Promise<string | undefined>;
    act(() => {
      result = modal.form<string>({
        title: "Add project",
        submitLabel: "Add",
        validate: (values) => ({ title: values.title ? undefined : "Add a title." }),
        onSubmit,
        fields: ({ errors }) => <Input name="title" label="Title" error={errors.title} />,
      });
    });
    return { result: () => result!, onSubmit };
  }

  it("focuses the first field when it opens", async () => {
    const { modal } = renderWithOverlays();
    openProjectForm(modal);
    expect(await screen.findByLabelText("Title")).toBe(document.activeElement);
  });

  it("shows validation errors and doesn't submit invalid data", async () => {
    const { modal } = renderWithOverlays();
    const { onSubmit } = openProjectForm(modal);
    await userEvent.click(await screen.findByRole("button", { name: "Add" }));

    const field = screen.getByLabelText("Title");
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Add a title.")).toBeTruthy();
    expect(document.activeElement).toBe(field);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits valid data, closes and resolves with the result", async () => {
    const { modal } = renderWithOverlays();
    const { result, onSubmit } = openProjectForm(modal);
    await userEvent.type(await screen.findByLabelText("Title"), "Brand film");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    await expect(result()).resolves.toBe("Brand film");
    expect(onSubmit).toHaveBeenCalledWith({ title: "Brand film" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("keeps the form open with an error message if saving fails", async () => {
    const { modal } = renderWithOverlays();
    openProjectForm(
      modal,
      vi.fn(async () => {
        throw new Error("Saving failed.");
      }),
    );
    await userEvent.type(await screen.findByLabelText("Title"), "Brand film");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Saving failed.");
    expect(screen.getByLabelText("Title")).toHaveProperty("value", "Brand film");
  });

  it("resolves undefined when cancelled", async () => {
    const { modal } = renderWithOverlays();
    const { result } = openProjectForm(modal);
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await expect(result()).resolves.toBeUndefined();
  });
});

describe("toasts", () => {
  it("show their title and description", async () => {
    const { toast } = renderWithOverlays();
    act(() => toast.success("Changes saved", "Your portfolio is up to date."));
    expect(await screen.findByText("Changes saved")).toBeTruthy();
    expect(screen.getByText("Your portfolio is up to date.")).toBeTruthy();
  });

  it("can be dismissed", async () => {
    const { toast } = renderWithOverlays();
    act(() => toast.error("Upload failed"));
    await userEvent.click(await screen.findByRole("button", { name: "Dismiss notification" }));
    await waitFor(() => expect(screen.queryByText("Upload failed")).toBeNull());
  });
});

describe("hooks outside the provider", () => {
  it("explain how to fix the mistake", () => {
    function Broken() {
      useModal();
      return null;
    }
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Broken />)).toThrow("useModal must be used inside <OverlayProvider>.");
  });
});
