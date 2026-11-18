"use client";

import { Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button, Card, Input, Select, Spinner, Textarea } from "@/design-system";
import { Drawer, useModal, useToast, type FieldErrors, type FormValues } from "@/overlays";

/**
 * Internal review page for the design system (Milestone 2). It only uses the
 * public components — no special styling — so what you see here is exactly
 * what features will get.
 */
export function Showcase() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted uppercase">
            Internal · not visible in production
          </p>
          <h1 className="mt-1 text-4xl font-bold">Design system</h1>
          <p className="mt-2 max-w-xl text-muted">
            Every token, component and overlay CheckMeOut is built from.
          </p>
        </div>
        <ThemeSwitch />
      </header>

      <Section title="Colours">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SWATCHES.map(([name, className]) => (
            <div key={name} className="flex items-center gap-3">
              <span className={`size-10 shrink-0 rounded-md border border-border ${className}`} />
              <span className="text-sm">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="flex flex-col gap-2">
          <p className="text-4xl font-bold">Show the world your work</p>
          <p className="text-3xl font-bold">Large heading</p>
          <p className="text-2xl font-semibold">Medium heading</p>
          <p className="text-xl font-semibold">Small heading</p>
          <p className="text-base">
            Body text — clean, friendly and easy to read for longer passages.
          </p>
          <p className="text-sm text-muted">Small muted text for hints and secondary details.</p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button icon={<Sparkles aria-hidden="true" className="size-4" />}>With icon</Button>
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section title="Form controls">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Display name" placeholder="Priya Sharma" hint="Shown on your portfolio." />
          <Input label="Username" defaultValue="pri ya" error="Use letters, numbers and hyphens." />
          <Select
            label="Profession"
            placeholder="Choose a profession"
            options={[
              { value: "designer", label: "Designer" },
              { value: "editor", label: "Video editor" },
              { value: "photographer", label: "Photographer" },
            ]}
          />
          <Input label="Website" placeholder="https://" disabled />
          <div className="sm:col-span-2">
            <Textarea label="Bio" placeholder="A few lines about you and your work" required />
          </div>
        </div>
      </Section>

      <Section title="Cards and loading">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <p className="font-semibold">Raised</p>
            <p className="text-sm text-muted">Default card.</p>
          </Card>
          <Card tone="flat">
            <p className="font-semibold">Flat</p>
            <p className="text-sm text-muted">No shadow.</p>
          </Card>
          <Card tone="sunken">
            <p className="font-semibold">Sunken</p>
            <p className="text-sm text-muted">For wells and groups.</p>
          </Card>
        </div>
        <div className="flex items-center gap-6 text-primary">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" label="Loading example" />
        </div>
      </Section>

      <Section title="Overlays">
        <OverlayDemos />
      </Section>
    </main>
  );
}

const SWATCHES = [
  ["Background", "bg-bg"],
  ["Surface", "bg-surface"],
  ["Sunken", "bg-surface-sunken"],
  ["Text", "bg-text"],
  ["Muted", "bg-muted"],
  ["Primary", "bg-primary"],
  ["Primary soft", "bg-primary-soft"],
  ["Danger", "bg-danger"],
  ["Success", "bg-success"],
  ["Warning", "bg-warning"],
  ["Info", "bg-info"],
  ["Border strong", "bg-border-strong"],
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">{title}</h2>
      <Card className="flex flex-col gap-5">{children}</Card>
    </section>
  );
}

const THEMES = ["light", "dark"] as const;

/** Previews the dark-mode foundation by toggling data-theme on <html>. */
function ThemeSwitch() {
  const [theme, setTheme] = useState<(typeof THEMES)[number]>("light");
  return (
    <div role="group" aria-label="Colour theme" className="flex gap-2">
      {THEMES.map((option) => (
        <Button
          key={option}
          size="sm"
          variant={theme === option ? "primary" : "secondary"}
          aria-pressed={theme === option}
          onClick={() => {
            document.documentElement.dataset.theme = option;
            setTheme(option);
          }}
        >
          {option === "light" ? "Light" : "Dark"}
        </Button>
      ))}
    </div>
  );
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function validateProject(values: FormValues): FieldErrors {
  return {
    title: values.title?.trim() ? undefined : "Give your project a title.",
    client: values.client?.trim() ? undefined : "Add the client or brand.",
  };
}

function OverlayDemos() {
  const modal = useModal();
  const toast = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function confirmPublish() {
    const confirmed = await modal.confirm({
      title: "Publish your portfolio?",
      description: "It will be visible to anyone with the link.",
      confirmLabel: "Publish",
      onConfirm: () => wait(900),
    });
    if (confirmed) toast.success("Portfolio published", "Your link is ready to share.");
  }

  async function confirmDelete() {
    let attempts = 0;
    const deleted = await modal.confirm({
      title: "Delete this project?",
      description:
        "This can't be undone. The first attempt fails on purpose to show the error state.",
      confirmLabel: "Delete project",
      tone: "danger",
      onConfirm: async () => {
        await wait(700);
        attempts += 1;
        if (attempts === 1) throw new Error("Couldn't reach the server. Please try again.");
      },
    });
    if (deleted) toast.success("Project deleted");
  }

  async function openForm() {
    const saved = await modal.form({
      title: "Add project",
      description:
        "Leave fields empty to see validation. Type “fail” as the title to see a save error.",
      submitLabel: "Add project",
      validate: validateProject,
      onSubmit: async (values) => {
        await wait(900);
        if (values.title.trim().toLowerCase() === "fail") {
          throw new Error("Saving failed. Please try again.");
        }
        return values.title.trim();
      },
      fields: ({ errors }) => (
        <>
          <Input name="title" label="Project title" required error={errors.title} />
          <Input name="client" label="Client or brand" required error={errors.client} />
          <Textarea name="summary" label="Short summary" hint="Optional." rows={3} />
        </>
      ),
    });
    if (saved) toast.success("Project added", `“${saved}” is in your portfolio.`);
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Button onClick={confirmPublish}>Confirmation</Button>
        <Button variant="danger" onClick={confirmDelete}>
          Delete confirmation
        </Button>
        <Button variant="secondary" onClick={openForm}>
          Form modal
        </Button>
        <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
          Drawer
        </Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="ghost" onClick={() => toast.success("Changes saved")}>
          Success toast
        </Button>
        <Button
          variant="ghost"
          onClick={() => toast.error("Upload failed", "The file is larger than your plan allows.")}
        >
          Error toast
        </Button>
        <Button
          variant="ghost"
          onClick={() => toast.info("Tip", "Press F8 to jump to notifications.")}
        >
          Info toast
        </Button>
      </div>

      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Portfolio settings"
        description="Drawers share the modal's behaviour: focus trap, Escape, overlay and scroll lock."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setDrawerOpen(false);
                toast.success("Settings saved");
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Portfolio title" defaultValue="Priya Sharma — Video Editor" />
          <Select
            label="Visibility"
            defaultValue="public"
            options={[
              { value: "public", label: "Public" },
              { value: "unlisted", label: "Unlisted" },
            ]}
          />
          {Array.from({ length: 8 }, (_, index) => (
            <p key={index} className="text-sm text-muted">
              Long content scrolls inside the drawer while the header and footer stay in place.
            </p>
          ))}
        </div>
      </Drawer>
    </>
  );
}
