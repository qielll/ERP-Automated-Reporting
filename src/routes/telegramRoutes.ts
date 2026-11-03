import { Router } from "express";
import { relayTelegramUpdate } from "../controllers/telegramRelayController";

const router = Router();

/** POST /api/telegram/webhook — Telegram's webhook target; forwards to the Apps Script bot. */
router.post("/telegram/webhook", relayTelegramUpdate);

export default router;
