/**
 * Brevo (ex-Sendinblue) transactional email — contact form delivery.
 * API: https://api.brevo.com/v3/smtp/email
 */

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

export interface ContactFormPayload {
  name: string;
  email: string;
  type: 'issue' | 'general';
  subject: string;
  message: string;
}

export interface SendContactEmailOptions {
  /** Recipient inbox that receives the contact submission (e.g. support@yourdomain.com). */
  toEmail: string;
  /** Sender shown in the email (must be a verified sender in Brevo). */
  fromEmail: string;
  /** Sender name. */
  fromName?: string;
}

/**
 * Send contact form data as a transactional email via Brevo.
 * Returns { success: true } or throws with a message.
 */
export async function sendContactEmail(
  payload: ContactFormPayload,
  options: SendContactEmailOptions
): Promise<{ success: true }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('BREVO_API_KEY is not set');
  }

  const typeLabel = payload.type === 'issue' ? 'Report an issue' : 'General question';
  const subject = `[Contact] ${typeLabel}${payload.subject ? `: ${payload.subject}` : ''}`.slice(0, 120);

  const textContent = [
    `Type: ${typeLabel}`,
    `From: ${payload.name} <${payload.email}>`,
    `Subject: ${payload.subject || '(none)'}`,
    '',
    payload.message,
  ].join('\n');

  const htmlContent = [
    `<p><strong>Type:</strong> ${typeLabel}</p>`,
    `<p><strong>From:</strong> ${payload.name} &lt;${payload.email}&gt;</p>`,
    `<p><strong>Subject:</strong> ${payload.subject || '(none)'}</p>`,
    '<hr/>',
    `<pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(payload.message)}</pre>`,
  ].join('\n');

  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: {
        name: options.fromName ?? 'Contact Form',
        email: options.fromEmail,
      },
      to: [{ email: options.toEmail }],
      subject,
      textContent,
      htmlContent,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error('[Brevo]', res.status, errBody);
    throw new Error('Failed to send email');
  }

  return { success: true };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
