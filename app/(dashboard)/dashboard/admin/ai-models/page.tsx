'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getModelOptionsForSelect, optionsWithCurrent } from '@/lib/ai/openrouter-models';

interface AIModelConfig {
  extraction: string;
  analysis: string;
  synthesis: string;
  chat: string;
}

const LABELS: Record<keyof AIModelConfig, string> = {
  extraction: 'Extraction (vision/text → structured data)',
  analysis: 'Analysis (reasoning over extraction + constants)',
  synthesis: 'Synthesis (Markdown report)',
  chat: 'Chat (project Q&A)',
};

const baseOptions = getModelOptionsForSelect();

export default function AdminAIModelsPage() {
  const [config, setConfig] = useState<AIModelConfig | null>(null);
  const [draft, setDraft] = useState<AIModelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/ai-models')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Unauthorized'))))
      .then((data: AIModelConfig) => {
        setConfig(data);
        setDraft(data);
      })
      .catch(() => setConfig(null))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: keyof AIModelConfig, value: string) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/ai-models', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'err', text: data.error || 'Failed to save' });
        return;
      }
      setConfig(data);
      setDraft(data);
      setMessage({ type: 'ok', text: 'Saved. Pipeline and chat will use these models.' });
    } catch {
      setMessage({ type: 'err', text: 'Request failed' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold">AI model configuration</h1>
        <p className="mt-2 text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!config || !draft) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/admin/usage" className="text-sm text-muted-foreground hover:text-foreground">
          ← Usage & cost
        </Link>
        <div>
          <h1 className="text-2xl font-bold">AI model configuration</h1>
          <p className="mt-2 text-muted-foreground">You need to be signed in to view and change AI models.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm text-primary hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
      </div>
      <h1 className="mt-4 text-2xl font-bold">AI model configuration</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        OpenRouter model IDs used for the pipeline (extraction → analysis → synthesis) and chat. Change and save to apply.
      </p>

      <div className="mt-6 space-y-4">
        {(Object.keys(LABELS) as Array<keyof AIModelConfig>).map((key) => {
          const options = optionsWithCurrent(baseOptions, draft[key]);
          return (
            <div key={key}>
              <label className="block text-sm font-medium text-foreground">{LABELS[key]}</label>
              <select
                value={draft[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {message && (
        <p className={`mt-4 text-sm ${message.type === 'ok' ? 'text-green-600' : 'text-destructive'}`}>
          {message.text}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-6 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}
