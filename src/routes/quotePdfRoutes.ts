import { Router } from "express";
import { downloadSaleOrderQuotePdf } from "../controllers/quotePdfController";

const router = Router();

router.get("/odoo/document/:docId/:docChoice/pdf", downloadSaleOrderQuotePdf);

export default router;
