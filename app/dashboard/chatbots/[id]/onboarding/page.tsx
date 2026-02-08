"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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

type RemoteChatbot = {
  id: string;
  name: string;
  token: string;
  description?: string;
  instructionText: string;
  instructionFiles?: Array<{
    id?: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    createdAt?: string;
  }>;
  settings: {
    tone?: string;
    humor?: string;
    theme?: string;
    allowEmojis?: boolean;
    widgetThemeMode?: "light" | "dark" | "system";
    widgetPrimaryColor?: string;
    widgetUserBubbleColor?: string;
    widgetBotBubbleColor?: string;
    widgetUserTextColor?: string;
    widgetBotTextColor?: string;
    widgetWelcomeMessage?: string;
  };
  faqs?: Array<{ question: string; answer: string }>;
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

function isStepId(x: string | null): x is StepId {
  return Boolean(x && (STEP_ORDER as readonly string[]).includes(x));
}

export default function ChatbotOnboardingPage() {
  const router = useRouter();
  const params = useParams();
  const search = useSearchParams();

  const id = typeof params?.id === "string" ? params.id : "";
  const step: StepId = isStepId(search.get("step"))
    ? (search.get("step") as StepId)
    : "identity";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chatbot, setChatbot] = useState<RemoteChatbot | null>(null);

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

  const [files, setFiles] = useState<
    Array<{
      id?: string;
      filename: string;
      mimeType: string;
      sizeBytes: number;
    }>
  >([]);
  const [uploading, setUploading] = useState(false);

  // Widget
  const [widgetThemeMode, setWidgetThemeMode] = useState<
    "light" | "dark" | "system"
  >("system");
  const [widgetPrimaryColor, setWidgetPrimaryColor] = useState("#111111");
  const [widgetUserBubbleColor, setWidgetUserBubbleColor] = useState("#111111");
  const [widgetBotBubbleColor, setWidgetBotBubbleColor] = useState("#f1f1f1");
  const [widgetUserTextColor, setWidgetUserTextColor] = useState("#ffffff");
  const [widgetBotTextColor, setWidgetBotTextColor] = useState("#111111");
  const [widgetWelcomeMessage, setWidgetWelcomeMessage] = useState("");

  function goStep(s: StepId) {
    const url = `/dashboard/chatbots/${id}/onboarding?step=${encodeURIComponent(
      s
    )}`;
    router.push(url);
  }

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/user/chatbots/${id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Failed to load chatbot");
        return;
      }

      const c = data?.chatbot as RemoteChatbot;
      setChatbot(c);

      setName(c?.name ?? "");
      setDescription(c?.description ?? "");
      setInstructionText(c?.instructionText ?? "");
      setFaqs(
        (c?.faqs ?? []).map((f) => ({
          question: f.question ?? "",
          answer: f.answer ?? "",
        }))
      );
      setFiles(
        (c?.instructionFiles ?? []).map((f) => ({
          id: f.id,
          filename: f.filename,
          mimeType: f.mimeType,
          sizeBytes: f.sizeBytes,
        }))
      );

      const s = c?.settings ?? {};
      setTone((s.tone as ChatbotTone) ?? CHATBOT_OPTIONS.tone[0]);
      setHumor((s.humor as ChatbotHumor) ?? CHATBOT_OPTIONS.humor[0]);
      setTheme((s.theme as ChatbotTheme) ?? CHATBOT_OPTIONS.theme[0]);
      setAllowEmojis(Boolean(s.allowEmojis));

      setWidgetThemeMode(s.widgetThemeMode ?? "system");
      setWidgetPrimaryColor(s.widgetPrimaryColor ?? "#111111");
      setWidgetUserBubbleColor(s.widgetUserBubbleColor ?? "#111111");
      setWidgetBotBubbleColor(s.widgetBotBubbleColor ?? "#f1f1f1");
      setWidgetUserTextColor(s.widgetUserTextColor ?? "#ffffff");
      setWidgetBotTextColor(s.widgetBotTextColor ?? "#111111");
      setWidgetWelcomeMessage(s.widgetWelcomeMessage ?? "");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function savePartial(partial: Record<string, unknown>) {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/user/chatbots/${id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Failed to save");
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

  async function onNext() {
    if (step === "identity") {
      const ok = await savePartial({ name, description });
      if (ok) goStep(nextStep(step));
      return;
    }

    if (step === "behavior") {
      const ok = await savePartial({
        settings: {
          tone,
          humor,
          theme,
          allowEmojis,
        },
      });
      if (ok) goStep(nextStep(step));
      return;
    }

    if (step === "knowledge") {
      const ok = await savePartial({ instructionText, faqs });
      if (ok) goStep(nextStep(step));
      return;
    }

    if (step === "widget") {
      const ok = await savePartial({
        settings: {
          widgetThemeMode,
          widgetPrimaryColor,
          widgetUserBubbleColor,
          widgetBotBubbleColor,
          widgetUserTextColor,
          widgetBotTextColor,
          widgetWelcomeMessage,
        },
      });
      if (ok) goStep(nextStep(step));
      return;
    }

    if (step === "embed") {
      router.push(`/dashboard/chatbots/${id}/overview`);
      return;
    }
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

  async function uploadFile(file: File) {
    if (!id) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`/api/user/chatbots/${id}/files`, {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Failed to upload file");
        return;
      }

      // Refresh to get latest files + faqs etc.
      await load();
    } catch {
      setError("Network error");
    } finally {
      setUploading(false);
    }
  }

  function StepPill({ id: pillStep, label }: { id: StepId; label: string }) {
    const isActive = pillStep === step;
    const isDone = STEP_ORDER.indexOf(pillStep) < STEP_ORDER.indexOf(step);
    return (
      <button
        type="button"
        onClick={() => goStep(pillStep)}
        className={
          "rounded-full border px-3 py-1 text-xs transition-colors " +
          (isActive
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

  return (
    <div className="mx-auto max-w-3xl grid gap-6">
      <Card>
        <CardHeader className="grid gap-2">
          <CardTitle>Set up your chatbot</CardTitle>
          <div className="text-sm text-muted-foreground">
            Complete these steps to finish onboarding.
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <StepPill id="identity" label="1. Identity" />
            <StepPill id="behavior" label="2. Behavior" />
            <StepPill id="knowledge" label="3. Knowledge" />
            <StepPill id="widget" label="4. Widget" />
            <StepPill id="embed" label="5. Embed" />
          </div>
        </CardHeader>

        <CardContent className="grid gap-4">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Couldn’t continue</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : !chatbot ? (
            <div className="text-sm text-muted-foreground">
              Chatbot not found.
            </div>
          ) : (
            <>
              {step === "identity" ? (
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Support Bot"
                      maxLength={120}
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

                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Upload documents</div>
                    <div className="text-sm text-muted-foreground">
                      Upload PDFs, docs, or text files. We’ll extract content
                      and index it for the chatbot.
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Input
                        type="file"
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadFile(f);
                          // allow re-uploading same file
                          e.currentTarget.value = "";
                        }}
                      />
                      <div className="text-xs text-muted-foreground">
                        {uploading ? "Uploading…" : null}
                      </div>
                    </div>

                    {files.length ? (
                      <div className="grid gap-1">
                        <div className="text-xs text-muted-foreground">
                          Uploaded ({files.length})
                        </div>
                        <div className="grid gap-2">
                          {files.map((f) => (
                            <div
                              key={f.id ?? f.filename}
                              className="rounded-md border bg-background px-3 py-2 text-sm flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <div className="truncate font-medium">
                                  {f.filename}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {f.mimeType} •{" "}
                                  {Math.round(f.sizeBytes / 1024)} KB
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        No documents uploaded yet.
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="grid gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">FAQ</div>
                        <div className="text-sm text-muted-foreground">
                          Add common questions and answers. These are also
                          indexed.
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
                          <div
                            key={idx}
                            className="rounded-md border p-3 grid gap-3"
                          >
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
                        setWidgetThemeMode(
                          e.target.value as typeof widgetThemeMode
                        )
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
                        onChange={(e) =>
                          setWidgetUserBubbleColor(e.target.value)
                        }
                        className="h-10 w-16 p-1"
                      />
                      <Input
                        value={widgetUserBubbleColor}
                        onChange={(e) =>
                          setWidgetUserBubbleColor(e.target.value)
                        }
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label>Bot bubble</Label>
                      <Input
                        type="color"
                        value={widgetBotBubbleColor}
                        onChange={(e) =>
                          setWidgetBotBubbleColor(e.target.value)
                        }
                        className="h-10 w-16 p-1"
                      />
                      <Input
                        value={widgetBotBubbleColor}
                        onChange={(e) =>
                          setWidgetBotBubbleColor(e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1">
                      <Label>User text</Label>
                      <Input
                        type="color"
                        value={widgetUserTextColor}
                        onChange={(e) => setWidgetUserTextColor(e.target.value)}
                        className="h-10 w-16 p-1"
                      />
                      <Input
                        value={widgetUserTextColor}
                        onChange={(e) => setWidgetUserTextColor(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label>Bot text</Label>
                      <Input
                        type="color"
                        value={widgetBotTextColor}
                        onChange={(e) => setWidgetBotTextColor(e.target.value)}
                        className="h-10 w-16 p-1"
                      />
                      <Input
                        value={widgetBotTextColor}
                        onChange={(e) => setWidgetBotTextColor(e.target.value)}
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
                            color: widgetBotTextColor,
                          }}
                        >
                          {widgetWelcomeMessage?.trim()
                            ? widgetWelcomeMessage.trim()
                            : "Hi! How can I help?"}
                        </div>
                        <div
                          className="max-w-[85%] rounded-2xl px-3 py-2 text-sm justify-self-end"
                          style={{
                            background: widgetUserBubbleColor,
                            color: widgetUserTextColor,
                          }}
                        >
                          Do you have a refund policy?
                        </div>
                        <div
                          className="max-w-[85%] rounded-2xl px-3 py-2 text-sm"
                          style={{
                            background: widgetBotBubbleColor,
                            color: widgetBotTextColor,
                          }}
                        >
                          Yes — returns are accepted within 30 days.
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
                  <div className="text-sm text-muted-foreground">
                    Your widget is ready. Copy the embed code below.
                  </div>

                  <div className="grid gap-2">
                    <Label>Token</Label>
                    <code className="text-xs break-all rounded-md border bg-background p-2">
                      {chatbot.token}
                    </code>
                  </div>

                  <div className="grid gap-2">
                    <Label>Embed code</Label>
                    <textarea
                      readOnly
                      className="w-full min-h-28 rounded-md border bg-background p-2 text-xs"
                      value={buildEmbedCode(chatbot.token)}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        router.push(
                          `/embed?token=${encodeURIComponent(chatbot.token)}`
                        )
                      }
                    >
                      Open widget
                    </Button>
                    <Link
                      href={`/dashboard/chatbots/${id}/overview`}
                      className="text-sm underline underline-offset-4 place-self-center"
                    >
                      Go to overview
                    </Link>
                  </div>
                </div>
              ) : null}

              <Separator />

              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={step === "identity"}
                  onClick={() => goStep(prevStep(step))}
                >
                  Back
                </Button>

                <div className="text-xs text-muted-foreground">
                  Step {STEP_ORDER.indexOf(step) + 1} of {STEP_ORDER.length}
                </div>

                <Button
                  type="button"
                  disabled={saving}
                  onClick={() => void onNext()}
                >
                  {step === "embed" ? "Finish" : saving ? "Saving…" : "Next"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
