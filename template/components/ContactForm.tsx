'use client';

import { useState } from 'react';

type ContactType = 'issue' | 'general';

export default function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const body = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      type: (formData.get('type') as ContactType) || 'general',
      subject: formData.get('subject') as string,
      message: formData.get('message') as string,
    };

    if (!body.name?.trim() || !body.email?.trim() || !body.message?.trim()) {
      setStatus('error');
      setErrorMessage('Please fill in name, email, and message.');
      return;
    }

    setStatus('sending');
    setErrorMessage('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus('error');
        setErrorMessage((data as { error?: string }).error ?? 'Something went wrong. Please try again.');
        return;
      }
      setStatus('success');
      form.reset();
    } catch {
      setStatus('error');
      setErrorMessage('Network error. Please try again.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-1 block text-sm font-medium">
            Name
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Your name"
            disabled={status === 'sending'}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="you@example.com"
            disabled={status === 'sending'}
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-type" className="mb-1 block text-sm font-medium">
          I&apos;m reaching out about
        </label>
        <select
          id="contact-type"
          name="type"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          disabled={status === 'sending'}
        >
          <option value="general">General question</option>
          <option value="issue">Report an issue</option>
        </select>
      </div>

      <div>
        <label htmlFor="contact-subject" className="mb-1 block text-sm font-medium">
          Subject
        </label>
        <input
          id="contact-subject"
          name="subject"
          type="text"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="Brief summary"
          disabled={status === 'sending'}
        />
      </div>

      <div>
        <label htmlFor="contact-message" className="mb-1 block text-sm font-medium">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-y"
          placeholder="Describe your issue or question..."
          disabled={status === 'sending'}
        />
      </div>

      {status === 'error' && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}
      {status === 'success' && (
        <p className="text-sm text-green-600">Thanks — we&apos;ll get back to you soon.</p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        style={{ backgroundColor: 'var(--brand-primary, #2563eb)' }}
      >
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
