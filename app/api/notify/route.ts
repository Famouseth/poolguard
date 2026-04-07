import { NextRequest, NextResponse } from "next/server";
import type { Alert, NotificationSettings } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildAlertMessage(alert: Alert): string {
  const typeLabel: Record<string, string> = {
    apr_spike: "APR Spike",
    range_exit: "Range Exit",
    volume_surge: "Volume Surge",
    fee_collect: "Fee Collect",
  };
  const isUsd = alert.type === "volume_surge" || alert.type === "fee_collect";
  const fmt = (v: number) =>
    isUsd
      ? `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
      : `${v.toFixed(1)}%`;
  return (
    `🚨 PoolGuard Alert\n\n` +
    `Pool: ${alert.poolLabel}\n` +
    `Type: ${typeLabel[alert.type] ?? alert.type}\n` +
    `Current: ${fmt(alert.currentValue)}\n` +
    `Threshold: ${fmt(alert.threshold)}`
  );
}

// ─── Telegram ─────────────────────────────────────────────────────────────────

async function sendTelegram(
  chatId: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN not configured" };

  const res = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { description?: string };
    return { ok: false, error: body.description ?? "Telegram API error" };
  }
  return { ok: true };
}

// ─── Email (Resend) ───────────────────────────────────────────────────────────

async function sendEmail(
  address: string,
  subject: string,
  plainText: string,
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "alerts@poolguard.app";
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not configured" };

  const html = `<pre style="font-family:monospace;font-size:14px;white-space:pre-wrap;line-height:1.6">${plainText}</pre>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [address], subject, html }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: false, error: body.message ?? "Resend API error" };
  }
  return { ok: true };
}

// ─── WhatsApp (Twilio) ────────────────────────────────────────────────────────

async function sendWhatsApp(
  to: string,
  text: string,
): Promise<{ ok: boolean; error?: string; waLink?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM ?? "+14155238886";

  if (!sid || !authToken) {
    // Fallback: pre-filled wa.me link (user clicks to send)
    const number = to.replace(/^\+/, "");
    const waLink = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
    return { ok: false, error: "Twilio not configured — click the wa.me link", waLink };
  }

  const params = new URLSearchParams({
    From: `whatsapp:${from}`,
    To: `whatsapp:${to}`,
    Body: text,
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    return { ok: false, error: body.message ?? "Twilio API error" };
  }
  return { ok: true };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: {
    alerts?: Alert[];
    channels?: NotificationSettings;
    test?: boolean;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { channels, alerts: alertItems, test: isTest } = body;

  if (!channels || typeof channels !== "object") {
    return NextResponse.json({ error: "Missing channels" }, { status: 400 });
  }

  // Build message
  let message: string;
  if (isTest) {
    message = "✅ PoolGuard: Test notification — alerts are configured correctly!";
  } else if (!alertItems?.length) {
    return NextResponse.json({ ok: true, results: {} });
  } else {
    message = alertItems.map(buildAlertMessage).join("\n\n---\n\n");
  }

  const results: Record<string, { ok: boolean; error?: string; waLink?: string }> = {};

  // Telegram
  if (channels.telegram?.enabled && channels.telegram.chatId?.trim()) {
    results.telegram = await sendTelegram(channels.telegram.chatId.trim(), message);
  }

  // Email
  if (channels.email?.enabled && channels.email.address?.trim()) {
    const subject = isTest
      ? "PoolGuard: Test Notification"
      : `PoolGuard Alert: ${alertItems!.map((a) => a.poolLabel).join(", ")}`;
    results.email = await sendEmail(channels.email.address.trim(), subject, message);
  }

  // WhatsApp
  if (channels.whatsapp?.enabled && channels.whatsapp.number?.trim()) {
    results.whatsapp = await sendWhatsApp(channels.whatsapp.number.trim(), message);
  }

  return NextResponse.json({ ok: true, results });
}
