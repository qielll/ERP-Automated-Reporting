import { Router } from "express";
import { downloadSaleOrderQuotePdf, previewDocumentHtml, attachQuotePdfToLead } from "../controllers/quotePdfController";

const router = Router();

router.get("/odoo/document/:docId/:docChoice/pdf", downloadSaleOrderQuotePdf);

/**
 * HTML preview endpoint — opens the document as plain HTML in the browser.
 * Great for debugging styles/layout without generating a PDF.
 *
 * GET /api/odoo/document/:docId/:docChoice/preview
 *   ?signature=1   — include the signature block
 *
 * Examples:
 *   http://localhost:8000/api/odoo/document/1234/draft/preview
 *   http://localhost:8000/api/odoo/document/1234/invoice/preview?signature=1
 *   http://localhost:8000/api/odoo/document/1234/sale/preview
 *   http://localhost:8000/api/odoo/document/1234/purchase-order/preview
 */
router.get("/odoo/document/:docId/:docChoice/preview", previewDocumentHtml);

/**
 * Generates the quotation PDF and posts it to the linked CRM lead's chatter as a Log Note.
 * GET (Odoo button, ?secret=...) answers with an HTML page; POST (X-Secret header) answers with JSON.
 */
router.get("/odoo/document/:docId/:docChoice/attach-to-lead", attachQuotePdfToLead);
router.post("/odoo/document/:docId/:docChoice/attach-to-lead", attachQuotePdfToLead);

export default router;
