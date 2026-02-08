"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  CHATBOT_LIMITS,
  CHATBOT_OPTIONS,
  type ChatbotHumor,
  type ChatbotTheme,
  type ChatbotTone,
} from "@/lib/chatbot/config";

function buildEmbedCode(token: string) {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://yourdomain.com";

  const src = `${origin}/embed?token=${encodeURIComponent(token)}`;
  return `<iframe\n  src="${src}"\n  style="width: 360px; height: 520px; border: 0; border-radius: 14px; overflow: hidden;"\n  loading="lazy"\n  referrerpolicy="no-referrer-when-downgrade"\n  title="mchatly chat widget"\n></iframe>`;
}

type CreatedChatbot = {
  id: string;
  token: string;
  name: string;
  description?: string;
};

const STEP_ORDER = [
  "identity",
  "behavior",
  "knowledge",
  "widget",
  "embed",
] as const;

type StepId = (typeof STEP_ORDER)[number];

function nextStep(step: StepId): StepId {
  const i = STEP_ORDER.indexOf(step);
  return STEP_ORDER[Math.min(i + 1, STEP_ORDER.length - 1)];
}

function prevStep(step: StepId): StepId {
  const i = STEP_ORDER.indexOf(step);
  return STEP_ORDER[Math.max(i - 1, 0)];
}

export default function NewChatbotOnboardingEntry() {
  const router = useRouter();

  // Step UI for the entry onboarding.
  // We create the chatbot only when finishing the Identity step.
  const [step, setStep] = useState<StepId>("identity");

  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [created, setCreated] = useState<CreatedChatbot | null>(null);

  // Identity
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Behavior
  const [tone, setTone] = useState<ChatbotTone>(CHATBOT_OPTIONS.tone[0]);
  const [humor, setHumor] = useState<ChatbotHumor>(CHATBOT_OPTIONS.humor[0]);
  const [theme, setTheme] = useState<ChatbotTheme>(CHATBOT_OPTIONS.theme[0]);
  const [allowEmojis, setAllowEmojis] = useState(false);

  // Knowledge
  const [instructionText, setInstructionText] = useState("");
  const remaining = useMemo(
    () => CHATBOT_LIMITS.instructionTextMaxChars - instructionText.length,
    [instructionText]
  );
  const [faqs, setFaqs] = useState<Array<{ question: string; answer: string }>>(
    []
  );

  // Widget
  const [widgetThemeMode, setWidgetThemeMode] = useState<
    "light" | "dark" | "system"
  >("system");
  const [widgetPrimaryColor, setWidgetPrimaryColor] = useState("#111111");
  const [widgetUserBubbleColor, setWidgetUserBubbleColor] = useState("#111111");
  const [widgetBotBubbleColor, setWidgetBotBubbleColor] = useState("#f1f1f1");
  const [widgetWelcomeMessage, setWidgetWelcomeMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function checkExisting() {
      try {
        const res = await fetch("/api/user/chatbots?limit=1");
        const data = await res.json().catch(() => ({}));
        const first = data?.chatbots?.[0];
        if (!cancelled && first?.id) {
          router.replace(`/dashboard/chatbots/${first.id}/overview`);
        }
      } catch {
        // ignore
      }
    }
    void checkExisting();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function StepPill({
    id: pillStep,
    label,
    disabled,
  }: {
    id: StepId;
    label: string;
    disabled?: boolean;
  }) {
    const isActive = pillStep === step;
    const isDone = STEP_ORDER.indexOf(pillStep) < STEP_ORDER.indexOf(step);
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setStep(pillStep)}
        className={
          "rounded-full border px-3 py-1 text-xs transition-colors " +
          (disabled
            ? "opacity-50 cursor-not-allowed"
            : isActive
            ? "bg-accent text-accent-foreground border-transparent"
            : isDone
            ? "bg-background hover:bg-accent"
            : "bg-background hover:bg-accent")
        }
      >
        {label}
      </button>
    );
  }

  function updateFaq(
    idx: number,
    patch: Partial<{ question: string; answer: string }>
  ) {
    setFaqs((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function addFaq() {
    setFaqs((prev) => [...prev, { question: "", answer: "" }]);
  }

  function removeFaq(idx: number) {
    setFaqs((prev) => prev.filter((_f, i) => i !== idx));
  }

  async function createChatbot() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/create-chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Failed to create chatbot");
        return null;
      }
      const c = data?.chatbot;
      if (!c?.id || !c?.token) {
        setError("Created, but missing chatbot id/token. Please try again.");
        return null;
      }
      const createdChatbot: CreatedChatbot = {
        id: String(c.id),
        token: String(c.token),
        name: String(c.name ?? name),
        description:
          typeof c.description === "string" ? c.description : description,
      };
      setCreated(createdChatbot);
      return createdChatbot;
    } catch {
      setError("Network error");
      return null;
    } finally {
      setCreating(false);
    }
  }

  async function saveAll(createdChatbot: CreatedChatbot) {
    setSaving(true);
    setError(null);
    try {
      // 1) Behavior + widget settings
      const res1 = await fetch(
        `/api/user/chatbots/${createdChatbot.id}/settings`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instructionText,
            faqs,
            settings: {
              tone,
              humor,
              theme,
              allowEmojis,
              widgetThemeMode,
              widgetPrimaryColor,
              widgetUserBubbleColor,
              widgetBotBubbleColor,
              widgetWelcomeMessage,
            },
          }),
        }
      );
      const data1 = await res1.json().catch(() => ({}));
      if (!res1.ok) {
        setError(data1?.error ?? "Failed to save settings");
        return false;
      }
      return true;
    } catch {
      setError("Network error");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function onFinish() {
    // Legacy alias: "finish" means create + save + jump to per-chatbot onboarding.
    const c = await createChatbot();
    if (!c) return;
    const ok = await saveAll(c);
    if (!ok) return;
    router.replace(`/dashboard/chatbots/${c.id}/onboarding?step=knowledge`);
  }

  async function onNext() {
    if (step === "identity") {
      // Create first (requires name)
      const c = await createChatbot();
      if (!c) return;

      // Immediately continue onboarding on the per-chatbot route so Knowledge step
      // includes document upload without any bouncing back.
      router.replace(`/dashboard/chatbots/${c.id}/onboarding?step=knowledge`);
      return;
    }

    // Any other step is now handled on the per-chatbot onboarding route.

    setStep(nextStep(step));
  }

  // Small UX helper: if they hit back to this page after creating, kick them to projects.
  useEffect(() => {
    // no-op for now; the route should stay stable.
  }, []);

  return (
    <div className="mx-auto max-w-3xl grid gap-6">
      <Card>
        <CardHeader className="grid gap-2">
          <CardTitle>Set up your chatbot</CardTitle>
          <div className="text-sm text-muted-foreground">
            Follow these steps. We’ll create the project on step 1.
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <StepPill id="identity" label="1. Identity" />
            <StepPill id="behavior" label="2. Behavior" disabled={!created} />
            <StepPill id="knowledge" label="3. Knowledge" disabled={!created} />
            <StepPill id="widget" label="4. Widget" disabled={!created} />
            <StepPill id="embed" label="5. Finish" disabled={!created} />
          </div>
        </CardHeader>

        <CardContent className="grid gap-4">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Couldn’t continue</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {step === "identity" ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Support Bot"
                  maxLength={120}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Answers FAQs and routes customers"
                  maxLength={500}
                />
              </div>

              <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                We’ll create the project when you click Next.
              </div>
            </div>
          ) : null}

          {step === "behavior" ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Tone</Label>
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={tone}
                  onChange={(e) => setTone(e.target.value as ChatbotTone)}
                >
                  {CHATBOT_OPTIONS.tone.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label>Humor</Label>
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={humor}
                  onChange={(e) => setHumor(e.target.value as ChatbotHumor)}
                >
                  {CHATBOT_OPTIONS.humor.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2">
                <Label>Theme</Label>
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as ChatbotTheme)}
                >
                  {CHATBOT_OPTIONS.theme.map((th) => (
                    <option key={th} value={th}>
                      {th}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowEmojis}
                  onChange={(e) => setAllowEmojis(e.target.checked)}
                />
                Allow emojis
              </label>
            </div>
          ) : null}

          {step === "knowledge" ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Instruction text</Label>
                <textarea
                  className="min-h-40 rounded-md border bg-background p-3 text-sm"
                  value={instructionText}
                  onChange={(e) => setInstructionText(e.target.value)}
                  maxLength={CHATBOT_LIMITS.instructionTextMaxChars}
                  placeholder="Add context about your business, policies, etc."
                />
                <div className="text-xs text-muted-foreground">
                  {remaining} characters remaining.
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">FAQ</div>
                  <div className="text-sm text-muted-foreground">
                    Add common questions and answers.
                  </div>
                </div>
                <Button type="button" variant="outline" onClick={addFaq}>
                  Add FAQ
                </Button>
              </div>

              {faqs.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No FAQs yet.
                </div>
              ) : (
                <div className="grid gap-3">
                  {faqs.map((f, idx) => (
                    <div key={idx} className="rounded-md border p-3 grid gap-3">
                      <div className="grid gap-2">
                        <Label>Question</Label>
                        <Input
                          value={f.question}
                          onChange={(e) =>
                            updateFaq(idx, { question: e.target.value })
                          }
                          placeholder="What are your hours?"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Answer</Label>
                        <textarea
                          className="min-h-20 rounded-md border bg-background p-3 text-sm"
                          value={f.answer}
                          onChange={(e) =>
                            updateFaq(idx, { answer: e.target.value })
                          }
                          placeholder="We’re open 9am–5pm, Monday–Friday."
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeFaq(idx)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                Document upload comes right after you finish this flow.
              </div>
            </div>
          ) : null}

          {step === "widget" ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Theme mode</Label>
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={widgetThemeMode}
                  onChange={(e) =>
                    setWidgetThemeMode(e.target.value as typeof widgetThemeMode)
                  }
                >
                  <option value="system">system</option>
                  <option value="light">light</option>
                  <option value="dark">dark</option>
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-1">
                  <Label>Primary</Label>
                  <Input
                    type="color"
                    value={widgetPrimaryColor}
                    onChange={(e) => setWidgetPrimaryColor(e.target.value)}
                    className="h-10 w-16 p-1"
                  />
                  <Input
                    value={widgetPrimaryColor}
                    onChange={(e) => setWidgetPrimaryColor(e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label>User bubble</Label>
                  <Input
                    type="color"
                    value={widgetUserBubbleColor}
                    onChange={(e) => setWidgetUserBubbleColor(e.target.value)}
                    className="h-10 w-16 p-1"
                  />
                  <Input
                    value={widgetUserBubbleColor}
                    onChange={(e) => setWidgetUserBubbleColor(e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label>Bot bubble</Label>
                  <Input
                    type="color"
                    value={widgetBotBubbleColor}
                    onChange={(e) => setWidgetBotBubbleColor(e.target.value)}
                    className="h-10 w-16 p-1"
                  />
                  <Input
                    value={widgetBotBubbleColor}
                    onChange={(e) => setWidgetBotBubbleColor(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Welcome message</Label>
                <textarea
                  className="min-h-20 rounded-md border bg-background p-3 text-sm"
                  value={widgetWelcomeMessage}
                  onChange={(e) => setWidgetWelcomeMessage(e.target.value)}
                  placeholder="e.g. Hi! How can I help you today?"
                  maxLength={500}
                />
                <div className="text-xs text-muted-foreground">
                  Shown once when a user opens the widget. Leave empty to
                  disable.
                </div>
              </div>

              <Separator />

              <div className="grid gap-2">
                <div className="text-sm font-medium">Preview</div>
                <div className="text-sm text-muted-foreground">
                  This is a quick preview of your bubble colors.
                </div>

                <div
                  className="rounded-[14px] border p-3 overflow-hidden"
                  style={{
                    background:
                      widgetThemeMode === "dark" ? "#0b0b0b" : "#ffffff",
                  }}
                >
                  <div className="text-xs text-muted-foreground mb-2">
                    {name.trim() ? name : "Your chatbot"}
                  </div>
                  <div className="grid gap-2">
                    <div
                      className="max-w-[85%] rounded-2xl px-3 py-2 text-sm"
                      style={{
                        background: widgetBotBubbleColor,
                        color:
                          widgetThemeMode === "dark" ? "#ffffff" : "#111111",
                      }}
                    >
                      Hi! How can I help?
                    </div>
                    <div
                      className="max-w-[85%] rounded-2xl px-3 py-2 text-sm justify-self-end"
                      style={{
                        background: widgetUserBubbleColor,
                        color: "#ffffff",
                      }}
                    >
                      What are your hours?
                    </div>
                    <div
                      className="max-w-[85%] rounded-2xl px-3 py-2 text-sm"
                      style={{
                        background: widgetBotBubbleColor,
                        color:
                          widgetThemeMode === "dark" ? "#ffffff" : "#111111",
                      }}
                    >
                      We’re open 9am–5pm.
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: widgetPrimaryColor }}
                      />
                      <div className="text-xs text-muted-foreground">
                        Primary color
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {step === "embed" ? (
            <div className="grid gap-4">
              <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                When you finish, we’ll redirect you to the per-chatbot
                onboarding page where you can upload documents.
              </div>

              {created ? (
                <div className="grid gap-2">
                  <Label>Project created</Label>
                  <code className="text-xs break-all rounded-md border bg-background p-2">
                    {created.id}
                  </code>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Go back to step 1 to create the project.
                </div>
              )}
            </div>
          ) : null}

          <Separator />

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/projects")}
            >
              Cancel
            </Button>

            <div className="text-xs text-muted-foreground">
              Step {STEP_ORDER.indexOf(step) + 1} of {STEP_ORDER.length}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={step === "identity" || creating || saving}
                onClick={() => setStep(prevStep(step))}
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={
                  creating || saving || (step === "identity" && !name.trim())
                }
                onClick={() => void onNext()}
              >
                {step === "identity"
                  ? creating
                    ? "Creating…"
                    : "Next"
                  : step === "embed"
                  ? saving
                    ? "Saving…"
                    : "Finish"
                  : "Next"}
              </Button>
            </div>
          </div>

          {created ? (
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              Created <span className="font-medium">{created.name}</span>. If
              you weren’t redirected automatically, open: <br />
              <code className="break-all">
                /dashboard/chatbots/{created.id}/onboarding?step=knowledge
              </code>
            </div>
          ) : null}

          {/* (Not shown by default; here for completeness if you want to display it later) */}
          {created?.token ? (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Advanced: embed code</summary>
              <div className="mt-2 grid gap-2">
                <code className="break-all rounded-md border bg-background p-2">
                  {created.token}
                </code>
                <textarea
                  readOnly
                  className="w-full min-h-28 rounded-md border bg-background p-2 text-xs"
                  value={buildEmbedCode(created.token)}
                />
              </div>
            </details>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
