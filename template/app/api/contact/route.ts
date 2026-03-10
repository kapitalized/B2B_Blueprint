/**
 * POST /api/contact — contact form submission (issues or general questions).
 * Sends via Brevo when BREVO_API_KEY and CONTACT_TO_EMAIL are set; otherwise logs only.
 */

import { NextResponse } from 'next/server';
import { sendContactEmail } from '@/lib/brevo';

const ALLOWED_TYPES = ['issue', 'general'] as const;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, type, subject, message } = body as {
      name?: string;
      email?: string;
      type?: string;
      subject?: string;
      message?: string;
    };

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 }
      );
    }

    const contactType = type && ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])
      ? (type as (typeof ALLOWED_TYPES)[number])
      : 'general';

    const payload = {
      name: name.trim(),
      email: email.trim(),
      type: contactType,
      subject: (subject ?? '').trim(),
      message: message.trim(),
    };

    const apiKey = process.env.BREVO_API_KEY;
    const toEmail = process.env.CONTACT_TO_EMAIL;

    if (apiKey && toEmail) {
      await sendContactEmail(payload, {
        toEmail,
        fromEmail: process.env.CONTACT_FROM_EMAIL ?? toEmail,
        fromName: process.env.CONTACT_FROM_NAME ?? undefined,
      });
    } else {
      console.info('[Contact]', {
        ...payload,
        message: payload.message.slice(0, 500),
        _note: 'Brevo not configured (BREVO_API_KEY + CONTACT_TO_EMAIL).',
      });
    }

    return NextResponse.json({ ok: true, message: 'Thank you. We will be in touch.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Submission failed';
    console.error('[Contact]', message);
    return NextResponse.json({ error: 'Unable to send your message. Please try again later.' }, { status: 500 });
  }
}
