"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, CheckIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { createReseller } from "../actions";
import {
  EMPTY_RESELLER,
  resellerErrors,
  resellerFormReady,
  toSettings,
  type ResellerForm,
} from "./reseller-fields";

type StepId =
  | "name"
  | "storefronts"
  | "stores"
  | "discount"
  | "billing"
  | "email"
  | "prices"
  | "brand"
  | "move"
  | "review";

type Storefront = { id: string; name: string };

const money = (n: number) => `$${n % 1 === 0 ? n : n.toFixed(2)}`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * "New reseller": one question at a time, like a short survey, then a summary to check before the account is made.
 * Picking an answer moves on by itself; typed answers move on with Continue or Enter. Editing a reseller later uses
 * the full form on its page.
 */
export function NewResellerButton({
  storefronts,
}: {
  storefronts: Storefront[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(EMPTY_RESELLER);
  const [chosen, setChosen] = React.useState<string[]>([]);
  const [step, setStep] = React.useState(0);
  // From the summary, an edited answer goes straight back to the summary.
  const [fromReview, setFromReview] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const steps: StepId[] = [
    "name",
    "storefronts",
    "stores",
    "discount",
    "billing",
    "email",
    "prices",
    "brand",
    ...(storefronts.length > 0 ? (["move"] as const) : []),
    "review",
  ];
  const id = steps[step];
  const problems = resellerErrors(form);
  const set = (patch: Partial<ResellerForm>) =>
    setForm((f) => ({ ...f, ...patch }));

  const reset = () => {
    setForm(EMPTY_RESELLER);
    setChosen([]);
    setStep(0);
    setFromReview(false);
  };
  const goTo = (target: StepId) => setStep(steps.indexOf(target));
  const next = () => {
    if (fromReview) {
      setFromReview(false);
      goTo("review");
    } else setStep((s) => Math.min(s + 1, steps.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const edit = (target: StepId) => {
    setFromReview(true);
    goTo(target);
  };

  const ok = stepReady(form, problems);

  const submit = () =>
    startTransition(async () => {
      const result = await createReseller(toSettings(form), chosen);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      reset();
      router.push(`/resellers/${result.data.id}`);
    });

  /** Picking an answer saves it and moves on. */
  const pick = (patch: Partial<ResellerForm>) => {
    set(patch);
    next();
  };

  const discount = Number(form.wholesalePercent) || 0;
  const small = Number(form.priceSmall) || 0;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon /> New reseller
      </Button>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (pending) return;
          setOpen(nextOpen);
          if (!nextOpen) reset();
        }}
      >
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
          <WizardProgress step={step} total={steps.length} review={id === "review"} />
          <form
            key={id}
            className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2 flex flex-1 flex-col gap-5 px-6 pt-6 pb-6 duration-200"
            onSubmit={(e) => {
              e.preventDefault();
              if (!ok[id] || pending) return;
              if (id === "review") submit();
              else next();
            }}
          >
            {STEP_VIEWS[id]({
              form,
              set,
              pick,
              problems,
              storefronts,
              chosen,
              setChosen,
              edit,
              small,
              discount,
            })}
            <WizardButtons
              review={id === "review"}
              ready={ok[id]}
              pending={pending}
              onBack={step > 0 && !fromReview ? back : undefined}
              label={fromReview ? "Save" : optionalEmpty(id, form, chosen) ? "Skip" : "Continue"}
            />
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Whether each step's answer can be sent on. */
function stepReady(form: ResellerForm, problems: ReturnType<typeof resellerErrors>): Record<StepId, boolean> {
  return {
    name: Boolean(form.name.trim()),
    storefronts: !problems.maxProducts,
    stores: !problems.maxTenants,
    discount: !problems.wholesalePercent,
    billing: true,
    email: !problems.billingEmail && !problems.stripeCustomerId,
    prices: !problems.priceSmall && !problems.priceMedium && !problems.priceLarge,
    brand: !problems.brandName && !problems.brandUrl,
    move: true,
    review: resellerFormReady(form)
  };
}

/** "Question 3 of 9" and a thin bar; the last step is the summary. */
function WizardProgress({ step, total, review }: { step: number; total: number; review: boolean }) {
  return (
    <div className="space-y-2 px-6 pt-6">
      <p className="text-muted-foreground text-xs tabular-nums">
        New reseller · {review ? "Check and create" : `Question ${step + 1} of ${total - 1}`}
      </p>
      <Progress value={((step + 1) / total) * 100} aria-label="Progress" className="h-1" />
    </div>
  );
}

/** Back on the left (left out on the first question and when changing one answer), the next step on the right. */
function WizardButtons({
  review,
  ready,
  pending,
  onBack,
  label
}: {
  review: boolean;
  ready: boolean;
  pending: boolean;
  onBack?: () => void;
  label: string;
}) {
  return (
    <div className="mt-auto flex items-center gap-2 pt-2">
      {onBack && (
        <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onBack}>
          <ArrowLeftIcon /> Back
        </Button>
      )}
      <div className="flex-1" />
      {review ? (
        <Button type="submit" disabled={!ready || pending}>
          {pending ? <Spinner /> : <CheckIcon />}
          Create reseller
        </Button>
      ) : (
        <Button type="submit" disabled={!ready}>
          {label}
        </Button>
      )}
    </div>
  );
}

type StepProps = {
  form: ResellerForm;
  set: (patch: Partial<ResellerForm>) => void;
  pick: (patch: Partial<ResellerForm>) => void;
  problems: ReturnType<typeof resellerErrors>;
  storefronts: Storefront[];
  chosen: string[];
  setChosen: React.Dispatch<React.SetStateAction<string[]>>;
  edit: (target: StepId) => void;
  small: number;
  discount: number;
};

/** Each question's body. Every step gets the same answers and setters; it uses what it needs. */
const STEP_VIEWS: Record<StepId, (p: StepProps) => React.ReactNode> = {
  name: ({ form, set }) => (
    <Question
      title="What's the partner's business called?"
      hint="Their legal or trading name. It's how they show up in your lists and on their bill."
    >
      <Input
        aria-label="Business name"
        value={form.name}
        maxLength={100}
        autoFocus
        className="h-11 text-base"
        onChange={(e) => set({ name: e.target.value })}
      />
    </Question>
  ),
  storefronts: ({ form, set, pick, problems }) => (
    <Question
      title="How many storefronts can they open?"
      hint="A storefront is one shop they sell websites from, with its own keys and team."
    >
      <Choices
        value={form.maxProducts}
        options={[
          { value: "1", label: "One", note: "Most partners" },
          { value: "3", label: "Up to 3" },
          { value: "10", label: "Up to 10" },
          { value: "", label: "No limit" },
        ]}
        onPick={(v) => pick({ maxProducts: v })}
        other={{
          label: "Another number",
          value: form.maxProducts,
          error: problems.maxProducts,
          onChange: (v) => set({ maxProducts: v }),
        }}
      />
    </Question>
  ),
  stores: ({ form, set, pick, problems }) => (
    <Question
      title="How many websites can they run in all?"
      hint="Counted across every storefront they have. You can raise it later."
    >
      <Choices
        value={form.maxTenants}
        options={[
          { value: "10", label: "Up to 10" },
          { value: "25", label: "Up to 25" },
          { value: "50", label: "Up to 50" },
          { value: "", label: "No limit" },
        ]}
        onPick={(v) => pick({ maxTenants: v })}
        other={{
          label: "Another number",
          value: form.maxTenants,
          error: problems.maxTenants,
          onChange: (v) => set({ maxTenants: v }),
        }}
      />
    </Question>
  ),
  discount: ({ form, set, pick, problems, small, discount }) => (
    <Question
      title="What discount do they get?"
      hint="Taken off the list price of every live website on their monthly bill."
    >
      <Choices
        value={form.wholesalePercent}
        options={[
          { value: "30", label: "30% off" },
          { value: "40", label: "40% off", note: "Standard" },
          { value: "50", label: "50% off" },
        ]}
        onPick={(v) => pick({ wholesalePercent: v })}
        other={{
          label: "Another discount (%)",
          value: form.wholesalePercent,
          error: problems.wholesalePercent,
          onChange: (v) => set({ wholesalePercent: v }),
        }}
      />
      {!problems.wholesalePercent && small > 0 && (
        <p className="text-muted-foreground text-sm">
          A Small website at {money(small)} a month costs them{" "}
          {money(Math.round(small * (100 - discount)) / 100)}.
        </p>
      )}
    </Question>
  ),
  billing: ({ form, pick }) => (
    <Question
      title="How should they get their bill?"
      hint="It goes out on the 1st of each month."
    >
      <Choices
        value={form.autoInvoice ? "stripe" : "self"}
        options={[
          {
            value: "stripe",
            label: "Stripe sends it",
            note: "Charges their card on file, or emails an invoice to pay online",
          },
          {
            value: "self",
            label: "I'll send it myself",
            note: "You see the bill on their page and send it your own way",
          },
        ]}
        onPick={(v) => pick({ autoInvoice: v === "stripe" })}
      />
    </Question>
  ),
  email: ({ form, set, problems }) => (
    <Question
      title="Where should the bill go?"
      hint="The email address that gets their monthly bill. You can add it later."
    >
      <Field label="Billing email" error={problems.billingEmail}>
        <Input
          type="email"
          value={form.billingEmail}
          autoFocus
          placeholder="billing@partner.example"
          className="h-11 text-base"
          onChange={(e) => set({ billingEmail: e.target.value })}
        />
      </Field>
      {form.autoInvoice && (
        <Field
          label="Already a customer in Stripe? (optional)"
          hint="Their Stripe customer id. Leave it empty and one is made from the email."
          error={problems.stripeCustomerId}
        >
          <Input
            value={form.stripeCustomerId}
            placeholder="cus_…"
            onChange={(e) => set({ stripeCustomerId: e.target.value.trim() })}
          />
        </Field>
      )}
    </Question>
  ),
  prices: ({ form, set, problems }) => (
    <Question
      title="What's the list price per website?"
      hint="Monthly, in dollars, before their discount. These start at the Website plan's prices."
    >
      <div className="grid grid-cols-3 gap-3">
        {(
          [
            ["priceSmall", "Small"],
            ["priceMedium", "Medium"],
            ["priceLarge", "Large"],
          ] as const
        ).map(([key, label], i) => (
          <Field key={key} label={label} error={problems[key]}>
            <div className="relative">
              <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm">
                $
              </span>
              <Input
                inputMode="decimal"
                value={form[key]}
                autoFocus={i === 0}
                className="h-11 pl-6 text-base tabular-nums"
                onChange={(e) => set({ [key]: e.target.value.trim() })}
              />
            </div>
          </Field>
        ))}
      </div>
    </Question>
  ),
  brand: ({ form, set, problems }) => (
    <Question
      title="Whose name should their clients see?"
      hint="Shown to their team and on their websites' “site unavailable” page. Leave it empty to show AnyPress."
    >
      <Field label="Brand name" error={problems.brandName}>
        <Input
          value={form.brandName}
          maxLength={60}
          autoFocus
          placeholder="AnyPress"
          className="h-11 text-base"
          onChange={(e) => set({ brandName: e.target.value })}
        />
      </Field>
      <Field label="Brand link (optional)" error={problems.brandUrl}>
        <Input
          type="url"
          value={form.brandUrl}
          placeholder="https://partner.example"
          onChange={(e) => set({ brandUrl: e.target.value.trim() })}
        />
      </Field>
    </Question>
  ),
  move: ({ storefronts, chosen, setChosen }) => (
    <Question
      title="Move any storefronts in now?"
      hint="They keep their keys, team and websites. Pick none to start empty."
    >
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {storefronts.map((s) => {
          const on = chosen.includes(s.id);
          return (
            <label
              key={s.id}
              className={cn(
                "hover:bg-muted/60 flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
                on && "border-primary bg-primary/5",
              )}
            >
              <Checkbox
                checked={on}
                onCheckedChange={(v) =>
                  setChosen((c) =>
                    v === true ? [...c, s.id] : c.filter((x) => x !== s.id),
                  )
                }
              />
              <span className="font-medium">{s.name}</span>
            </label>
          );
        })}
      </div>
    </Question>
  ),
  review: ({ form, storefronts, chosen, edit }) => (
    <Question
      title={`Create ${form.name.trim() || "this reseller"}?`}
      hint="Check the answers. Everything here can be changed later on their page."
    >
      <dl className="divide-y rounded-lg border text-sm">
        {(
          [
            ["name", "Business", form.name.trim()],
            [
              "storefronts",
              "Storefronts",
              form.maxProducts === "1"
                ? "One"
                : form.maxProducts
                  ? `Up to ${form.maxProducts}`
                  : "No limit",
            ],
            [
              "stores",
              "Websites",
              form.maxTenants ? `Up to ${form.maxTenants}` : "No limit",
            ],
            [
              "discount",
              "Discount",
              `${form.wholesalePercent}% off list price`,
            ],
            [
              "billing",
              "Bill",
              form.autoInvoice
                ? "Stripe sends it on the 1st"
                : "You send it yourself",
            ],
            [
              "email",
              "Billing email",
              form.billingEmail.trim() || "Not set yet",
            ],
            [
              "prices",
              "List prices",
              `${money(Number(form.priceSmall))} · ${money(Number(form.priceMedium))} · ${money(Number(form.priceLarge))} a month`,
            ],
            ["brand", "Brand", form.brandName.trim() || "AnyPress"],
            ...(storefronts.length > 0
              ? ([
                  [
                    "move",
                    "Moving in",
                    chosen.length
                      ? plural(chosen.length, "storefront")
                      : "None",
                  ],
                ] as const)
              : []),
          ] as const
        ).map(([target, label, value]) => (
          <div key={target} className="flex items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1 sm:flex sm:gap-3">
              <dt className="text-muted-foreground text-xs sm:w-28 sm:shrink-0 sm:text-sm">
                {label}
              </dt>
              <dd className="min-w-0 font-medium break-words">{value}</dd>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-me-2 h-7 text-xs"
              onClick={() => edit(target)}
            >
              Change<span className="sr-only"> {label.toLowerCase()}</span>
            </Button>
          </div>
        ))}
      </dl>
    </Question>
  ),
};

/** Optional questions left empty say "Skip" instead of "Continue". */
function optionalEmpty(id: StepId, f: ResellerForm, chosen: string[]) {
  if (id === "email")
    return !f.billingEmail.trim() && !f.stripeCustomerId.trim();
  if (id === "brand") return !f.brandName.trim() && !f.brandUrl.trim();
  if (id === "move") return chosen.length === 0;
  return false;
}

/** One question: the dialog's title, a line on why it's asked, and the answer. */
function Question({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <DialogHeader className="text-left">
        <DialogTitle className="text-xl leading-snug font-semibold text-balance">
          {title}
        </DialogTitle>
        <DialogDescription className="text-pretty">{hint}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">{children}</div>
    </>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactElement;
}) {
  const id = React.useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {React.cloneElement(children as React.ReactElement<{ id?: string }>, {
        id,
      })}
      {(error || hint) && (
        <p
          className={
            error ? "text-destructive text-sm" : "text-muted-foreground text-sm"
          }
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}

/**
 * Answers to pick, one per row. Picking one moves on. "other" adds a typed answer for a number that isn't listed;
 * it opens by itself when the saved answer isn't one of the options.
 */
function Choices({
  value,
  options,
  onPick,
  other,
}: {
  value: string;
  options: { value: string; label: string; note?: string }[];
  onPick: (value: string) => void;
  other?: {
    label: string;
    value: string;
    error: string | null;
    onChange: (value: string) => void;
  };
}) {
  const listed = options.some((o) => o.value === value);
  const [typing, setTyping] = React.useState(!listed);
  const typingId = React.useId();
  // Like a survey: the letter beside an answer picks it, unless a box is being typed in.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        (e.target as HTMLElement).closest("input, textarea")
      )
        return;
      const i = e.key.toUpperCase().charCodeAt(0) - 65;
      if (e.key.length === 1 && i >= 0 && i < options.length) {
        e.preventDefault();
        setTyping(false);
        onPick(options[i].value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [options, onPick]);
  return (
    <div className="space-y-2" role="radiogroup">
      {options.map((o, i) => {
        const on = !typing && o.value === value;
        return (
          <button
            key={o.value || "none"}
            type="button"
            role="radio"
            aria-checked={on}
            autoFocus={on || (i === 0 && !listed && !other)}
            onClick={() => {
              setTyping(false);
              onPick(o.value);
            }}
            className={cn(
              "hover:bg-muted/60 focus-visible:ring-ring/50 flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors outline-none focus-visible:ring-[3px]",
              on && "border-primary bg-primary/5",
            )}
          >
            <span
              className="text-muted-foreground bg-background flex size-6 shrink-0 items-center justify-center rounded border text-xs font-medium tabular-nums"
              aria-hidden
            >
              {String.fromCharCode(65 + i)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{o.label}</span>
              {o.note && (
                <span className="text-muted-foreground block text-xs">
                  {o.note}
                </span>
              )}
            </span>
            {on && (
              <CheckIcon className="text-primary size-4 shrink-0" aria-hidden />
            )}
          </button>
        );
      })}
      {other &&
        (typing ? (
          <div className="space-y-1.5 pt-1">
            <Label htmlFor={typingId}>{other.label}</Label>
            <Input
              id={typingId}
              inputMode="numeric"
              value={other.value}
              autoFocus
              className="h-11 text-base tabular-nums"
              onChange={(e) => other.onChange(e.target.value.trim())}
            />
            {other.error && (
              <p className="text-destructive text-sm">{other.error}</p>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="text-primary text-sm font-medium underline-offset-4 hover:underline"
            onClick={() => setTyping(true)}
          >
            {other.label}
          </button>
        ))}
    </div>
  );
}
