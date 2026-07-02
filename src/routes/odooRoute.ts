import express from "express";
import { generateReport, writeEmailSent } from "../controllers/odooController";

const router = express.Router();

router.post("/call-email-reports", generateReport);
router.post("/write-email-sent", writeEmailSent);

export default router;
