import { Request, Response } from "express";
import crypto from "crypto";
import fetch from "node-fetch";

/**
 * Telegram -> this service -> Apps Script.
 *
 * Apps Script web apps answer a POST with a 302 redirect, which Telegram counts as a
 * failed delivery: it keeps retrying the same update and holds back newer ones. This
 * route sits in front: it checks Telegram's secret header, hands the update to the
 * Apps Script web app, and always answers Telegram with a plain 200.
 *
 * Env:
 *   TELEGRAM_RELAY_SECRET  must equal the secret_token given to Telegram's setWebhook
 *   APPS_SCRIPT_URL        the Apps Script web app "/exec" URL including "?key=<webhook secret>"
 */
const FORWARD_TIMEOUT_MS = 50_000;

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export async function relayTelegramUpdate(req: Request, res: Response) {
  const expected = process.env.TELEGRAM_RELAY_SECRET;
  const target = process.env.APPS_SCRIPT_URL;

  if (!expected || !target) {
    console.error("telegram relay: TELEGRAM_RELAY_SECRET or APPS_SCRIPT_URL is not set");
    return res.sendStatus(503);
  }

  const incoming = req.get("x-telegram-bot-api-secret-token") ?? "";
  if (!safeEqual(incoming, expected)) {
    return res.sendStatus(401);
  }

  try {
    // Awaited on purpose: Cloud Run may throttle CPU once the response is sent.
    const upstream = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body ?? {}),
      timeout: FORWARD_TIMEOUT_MS,
    });
    if (!upstream.ok) {
      console.error(`telegram relay: Apps Script answered ${upstream.status}`);
    }
  } catch (error) {
    console.error("telegram relay: forwarding to Apps Script failed:", error);
  }

  // Always 200 so Telegram never retries or stalls its queue; a dropped update just needs the command sent again.
  return res.sendStatus(200);
}
