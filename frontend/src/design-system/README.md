# Design system and overlays — how to use

Live examples of everything here: `/design-system` (local development and Vercel previews only).

## Rules

- **Style with tokens only.** Use utilities such as `bg-surface`, `text-muted`, `border-border`, `rounded-lg`, `shadow-md`, `text-sm`. Tailwind's default colours (`bg-red-500`, …) are switched off on purpose.
- **Change the look in one place.** Colours, type, spacing, radii, shadows and motion live in [`tokens.css`](tokens.css). `styles.css` only maps them to Tailwind.
- **Reuse before you build.** Use the components below; don't create a one-off button, input or modal.

## Components — `import { … } from "@/design-system"`

| Component                     | Use it for                                                       | Key props                                                                                           |
| ----------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `Button`                      | Every clickable action                                           | `variant` primary · secondary · ghost · danger, `size` sm · md · lg, `loading`, `icon`, `fullWidth` |
| `Input`, `Textarea`, `Select` | Form fields (labelled, with hint/error wired for screen readers) | `label`, `hint`, `error`, `required`, `name`                                                        |
| `Card`                        | Grouping content                                                 | `tone` raised · flat · sunken, `padding` none · sm · md · lg                                        |
| `Spinner`                     | Loading indicators                                               | `size`, `label` (announced to screen readers)                                                       |

## Overlays — `import { … } from "@/overlays"`

All overlays share one frame (`ModalShell`): focus trap, Escape to close, click-outside, scroll lock, focus returned on close, bottom sheet on phones.

```tsx
const modal = useModal();
const toast = useToast();

// Yes/no question → true or false
if (
  await modal.confirm({ title: "Delete project?", tone: "danger", onConfirm: () => api.delete(id) })
) {
  toast.success("Project deleted");
}

// A form: supply fields, validation and the save function — nothing else
const saved = await modal.form({
  title: "Add testimonial",
  validate: (v) => ({ quote: v.quote ? undefined : "Add the quote." }),
  onSubmit: (v) => api.testimonials.create(v),
  fields: ({ errors }) => <Textarea name="quote" label="Quote" error={errors.quote} />,
});

// Anything else (e.g. a drawer) through the same controller
modal.open((controls) => (
  <Drawer {...controls} title="Settings">
    …
  </Drawer>
));
```

Overlays can also be used declaratively: `<Drawer open={open} onOpenChange={setOpen} … />`.

New kinds of modal (media picker, upgrade prompt, multi-step) should be built **on top of `ModalShell`** when a feature needs them — never as a separate modal system.
