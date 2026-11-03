import { Request, Response, NextFunction } from "express";
import { getCachedUid } from "../services/authServices";
import fs from "fs";
import crypto from "crypto";
import { getSaleOrderQuoteData, getInvoiceData, getPurchaseOrder, attachPdfToLead, escapeHtml } from "../services/odooServices";
import { ENV } from "../config/config";
import {
  generateInvoicePdf,
  generatePurchasePdf,
  generateSaleOrderPdf,
  generateQuoteWithSignaturePdf,
  generateInvoiceWithSignaturePdf,
  previewSaleOrderHtml,
  previewSaleOrderWithSignatureHtml,
  previewInvoiceHtml,
  previewInvoiceWithSignatureHtml,
  previewPurchaseHtml,
} from "../services/quotePdfService";

type docTypes = "draft" | "invoice" | "sale" | "purchase-order";
export async function downloadSaleOrderQuotePdf(req: Request, res: Response, next: NextFunction) {
  try {
    const docId = Number(req.params.docId);
    const rawDocType = req.params.docChoice as string;

    if (rawDocType !== "draft" && rawDocType !== "invoice" && rawDocType !== "sale" && rawDocType !== "purchase-order") {
      return res.status(400).json({ error: "Invalid document type requested" });
    }

    const docType: docTypes = rawDocType;

    if (!Number.isInteger(docId) || docId <= 0) {
      res.status(400).json({
        error: "Invalid Sales Order ID",
      });
      return;
    }

    /**
     * Optional shared-secret security.
     * Better long-term option: protect this route with your own login/session.
     */
    const expectedSecret = process.env.ODOO_PDF_SECRET;

    if (expectedSecret) {
      const incomingSecret = req.query.secret;

      if (incomingSecret !== expectedSecret && process.env.NODE_ENV !== "production") {
        res.status(401).json({
          error: "Unauthorized",
        });
        return;
      }
    }
    const stampBase64 = fs.readFileSync("./src/assets/sign-psi.png").toString("base64");
    const signerImageSrc = `data:image/png;base64,${stampBase64}`;
    const documentHandler: Record<docTypes, (uid: number, dataId: number) => Promise<{ pdf: Buffer; filename: string }>> = {
      draft: async (uid, dataId) => {
        const quoteData = await getSaleOrderQuoteData(uid, dataId);
        const isSale = false;
        const pdfData = {
          document: quoteData.document,
          partner: quoteData.partner,
          company: quoteData.company,
          lines: quoteData.lines,
          groupedLines: quoteData.groupedLines,
          hasPartNumber: quoteData.hasPartNumber,
        };
        // const pdf = await generateSaleOrderPdf(pdfData, isSale);
        const pdf = await generateQuoteWithSignaturePdf(pdfData, false, signerImageSrc);
        const filename = `Quotation-${safeFilename(quoteData.document.name)}.pdf`;

        return { pdf, filename };
      },
      invoice: async (uid, dataId) => {
        const quoteData = await getInvoiceData(uid, dataId);
        const isSale = false;
        const pdfData = {
          document: quoteData.document,
          partner: quoteData.partner,
          company: quoteData.company,
          lines: quoteData.lines,
          groupedLines: quoteData.groupedLines,
          hasPartNumber: quoteData.hasPartNumber,
        };
        // const pdf = await generateInvoicePdf(pdfData);
        const pdf = await generateInvoiceWithSignaturePdf(pdfData, signerImageSrc);
        const filename = `Invoice-${safeFilename(quoteData.document.name)}.pdf`;
        return { pdf, filename };
      },
      sale: async (uid, dataId) => {
        const quoteData = await getSaleOrderQuoteData(uid, dataId);
        const isSale = true;
        const pdfData = {
          document: quoteData.document,
          partner: quoteData.partner,
          company: quoteData.company,
          lines: quoteData.lines,
          groupedLines: quoteData.groupedLines,
          hasPartNumber: quoteData.hasPartNumber,
        };
        const pdf = await generateSaleOrderPdf(pdfData, isSale);
        const filename = `Sale Order-${safeFilename(quoteData.document.name)}.pdf`;
        return { pdf, filename };
      },
      "purchase-order": async (uid, dataId) => {
        const quoteData = await getPurchaseOrder(uid, dataId);
        const pdfData = {
          document: quoteData.document,
          partner: quoteData.partner,
          company: quoteData.company,
          lines: quoteData.lines,
          groupedLines: quoteData.groupedLines,
          hasPartNumber: quoteData.hasPartNumber,
        };
        const pdf = await generatePurchasePdf(pdfData);
        const filename = `Purchase Order-${safeFilename(quoteData.document.name)}.pdf`;
        return { pdf, filename };
      },
    };

    res.setHeader("Content-Type", "application/pdf");
    const uid = await getCachedUid();
    const docData = await documentHandler[docType](uid, docId);
    /**
     * attachment = force download
     * inline = open in browser PDF viewer
     */
    res.setHeader("Content-Disposition", `inline; filename="${docData.filename}"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(docData.pdf);
  } catch (error) {
    next(error);
  }
}

function safeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// ---------------------------------------------------------------------------
// Attach the quotation PDF to the CRM lead's chatter as an internal Log Note.
//
//   GET  /api/odoo/document/:docId/:docChoice/attach-to-lead?secret=...
//        used by the Odoo button (act_url can't send headers); answers with a small HTML page
//   POST /api/odoo/document/:docId/:docChoice/attach-to-lead   (X-Secret header)
//        answers with JSON
//
// :docChoice is "auto" (by order state: draft/sent => quotation, otherwise sale order),
// "draft" (always the quotation) or "sale" (always the sale order).
// Unlike the PDF route, this one fails closed: no ODOO_PDF_SECRET configured => 401.
// ---------------------------------------------------------------------------
function isAuthorized(req: Request): boolean {
  const expected = process.env.ODOO_PDF_SECRET;
  if (!expected) return false;

  const header = req.get("x-secret");
  const incoming = header ? header : typeof req.query.secret === "string" ? req.query.secret : "";

  const a = Buffer.from(incoming);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// docType "auto" picks by the order's state: draft and sent are still quotations, anything else is a sale order.
async function renderSaleOrderPdf(uid: number, docType: "auto" | "draft" | "sale", docId: number): Promise<{ pdf: Buffer; filename: string }> {
  const stampBase64 = fs.readFileSync("./src/assets/sign-psi.png").toString("base64");
  const signerImageSrc = `data:image/png;base64,${stampBase64}`;

  const quoteData = await getSaleOrderQuoteData(uid, docId);
  const isQuotation = docType === "auto" ? quoteData.document.state === "draft" || quoteData.document.state === "sent" : docType === "draft";
  const pdfData = {
    document: quoteData.document,
    partner: quoteData.partner,
    company: quoteData.company,
    lines: quoteData.lines,
    groupedLines: quoteData.groupedLines,
    hasPartNumber: quoteData.hasPartNumber,
  };

  if (isQuotation) {
    const pdf = await generateQuoteWithSignaturePdf(pdfData, false, signerImageSrc);
    return { pdf, filename: `Quotation-${safeFilename(quoteData.document.name)}.pdf` };
  }

  const pdf = await generateSaleOrderPdf(pdfData, true);
  return { pdf, filename: `Sale Order-${safeFilename(quoteData.document.name)}.pdf` };
}

function odooLeadUrl(leadId: number): string | null {
  try {
    return `${new URL(ENV.ODOO_URL as string).origin}/odoo/crm.lead/${leadId}`;
  } catch {
    return null;
  }
}

function resultPage(ok: boolean, message: string, linkUrl: string | null): string {
  const link = linkUrl ? `<p><a href="${escapeHtml(linkUrl)}">Open the lead in Odoo</a></p>` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${ok ? "PDF attached" : "Not attached"}</title></head>
<body style="font-family:sans-serif;max-width:560px;margin:48px auto;padding:0 16px">
<h2 style="color:${ok ? "#1a7f37" : "#b3261e"}">${ok ? "PDF attached to the lead" : "Could not attach the PDF"}</h2>
<p>${escapeHtml(message)}</p>${link}</body></html>`;
}

export async function attachQuotePdfToLead(req: Request, res: Response, next: NextFunction) {
  const wantsHtml = req.method === "GET";
  const reply = (status: number, ok: boolean, message: string, linkUrl: string | null = null, extra: object = {}) =>
    wantsHtml ? res.status(status).type("html").send(resultPage(ok, message, linkUrl)) : res.status(status).json({ ok, message, ...extra });

  try {
    if (!isAuthorized(req)) {
      return reply(401, false, "Unauthorized");
    }

    const docId = Number(req.params.docId);
    const docType = req.params.docChoice as string;

    if (docType !== "auto" && docType !== "draft" && docType !== "sale") {
      return reply(400, false, 'Document type must be "auto", "draft" (quotation) or "sale" (sale order).');
    }
    if (!Number.isInteger(docId) || docId <= 0) {
      return reply(400, false, "Invalid Sales Order ID");
    }

    const uid = await getCachedUid();
    const { pdf, filename } = await renderSaleOrderPdf(uid, docType, docId);
    const result = await attachPdfToLead(uid, docId, filename, pdf);

    if (!result) {
      return reply(422, false, "This quotation is not linked to a CRM lead (Opportunity field is empty), so there is nowhere to attach the PDF.");
    }

    return reply(200, true, `${filename} was added to the chatter of "${result.leadName}" as a Log Note.`, odooLeadUrl(result.leadId), result);
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------------------
// HTML Preview endpoint — returns the raw HTML so you can open it in a
// browser, use DevTools to inspect / tweak styles, and iterate fast without
// downloading a PDF each time.
//
// URL pattern (mirrors the PDF route):
//   GET /api/odoo/document/:docId/:docChoice/preview
//
// Optional query param:
//   ?signature=1   — include the signature block (same as the *WithSignature PDF variants)
// ---------------------------------------------------------------------------
export async function previewDocumentHtml(req: Request, res: Response, next: NextFunction) {
  try {
    const docId = Number(req.params.docId);
    const rawDocType = req.params.docChoice as string;
    const withSignature = req.query.signature === "1";

    if (rawDocType !== "draft" && rawDocType !== "invoice" && rawDocType !== "sale" && rawDocType !== "purchase-order") {
      return res.status(400).json({ error: "Invalid document type requested" });
    }

    if (!Number.isInteger(docId) || docId <= 0) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    const expectedSecret = process.env.ODOO_PDF_SECRET;
    if (expectedSecret && req.query.secret !== expectedSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const uid = await getCachedUid();
    let html: string;

    const stampBase64 = fs.readFileSync("./src/assets/sign-psi.png").toString("base64");
    const signerImageSrc = `data:image/png;base64,${stampBase64}`;

    if (rawDocType === "draft" || rawDocType === "sale") {
      const isSale = rawDocType === "sale";
      const quoteData = await getSaleOrderQuoteData(uid, docId);
      const pdfData = {
        document: quoteData.document,
        partner: quoteData.partner,
        company: quoteData.company,
        lines: quoteData.lines,
        groupedLines: quoteData.groupedLines,
      };
      html = withSignature ? previewSaleOrderWithSignatureHtml(pdfData, isSale, signerImageSrc) : previewSaleOrderHtml(pdfData, isSale);
    } else if (rawDocType === "invoice") {
      const invoiceData = await getInvoiceData(uid, docId);
      const pdfData = {
        document: invoiceData.document,
        partner: invoiceData.partner,
        company: invoiceData.company,
        lines: invoiceData.lines,
        groupedLines: invoiceData.groupedLines,
        hasPartNumber: invoiceData.hasPartNumber,
      };
      html = withSignature ? previewInvoiceWithSignatureHtml(pdfData, signerImageSrc) : previewInvoiceHtml(pdfData);
    } else {
      // purchase-order
      const purchaseData = await getPurchaseOrder(uid, docId);
      const pdfData = {
        document: purchaseData.document,
        partner: purchaseData.partner,
        company: purchaseData.company,
        lines: purchaseData.lines,
        groupedLines: purchaseData.groupedLines,
        hasPartNumber: purchaseData.hasPartNumber,
      };
      html = previewPurchaseHtml(pdfData);
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(html);
  } catch (error) {
    next(error);
  }
}
