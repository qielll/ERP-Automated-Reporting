import { Request, Response, NextFunction } from "express";
import { getCachedUid } from "../services/authServices";
import { getSaleOrderQuoteData, getInvoiceData } from "../services/odooServices";
import { generateSaleOrderPdf } from "../services/quotePdfService";
import { SaleOrderQuoteData } from "../types/odoo.type";

type docTypes = "quotation" | "invoice" | "sales-order";
export async function downloadSaleOrderQuotePdf(req: Request, res: Response, next: NextFunction) {
  try {
    const docId = Number(req.params.docId);
    const rawDocType = req.params.docChoice as string;

    if (rawDocType !== "quotation" && rawDocType !== "invoice" && rawDocType !== "sales-order") {
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

      if (incomingSecret !== expectedSecret) {
        res.status(401).json({
          error: "Unauthorized",
        });
        return;
      }
    }

    const documentHandler: Record<docTypes, (uid: number, dataId: number) => Promise<{ pdf: Buffer; filename: string }>> = {
      quotation: async (uid, dataId) => {
        const quoteData = await getSaleOrderQuoteData(uid, dataId);
        const isSale = false;
        const pdf = await generateSaleOrderPdf(quoteData, isSale);
        const filename = `Quotation-${safeFilename(quoteData.order.name)}.pdf`;

        return { pdf, filename };
      },
      invoice: async (uid, dataId) => {
        const quoteData = await getInvoiceData(uid, dataId);
        const isSale = false;
        const pdf = await generateSaleOrderPdf(quoteData, isSale);
        const filename = `Invoice-${safeFilename(quoteData.order.name)}.pdf`;
        return { pdf, filename };
      },
      "sales-order": async (uid, dataId) => {
        const quoteData = await getSaleOrderQuoteData(uid, dataId);
        const isSale = true;
        const pdf = await generateSaleOrderPdf(quoteData, isSale);
        const filename = `Sale Order-${safeFilename(quoteData.order.name)}.pdf`;
        return { pdf, filename };
      },
    };

    // const quoteData = await getSaleOrderQuoteData(uid, docId);

    // const pdf = await generateSaleOrderPdf(quoteData);

    // const filename = `Quotation-${safeFilename(quoteData.order.name)}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    const uid = await getCachedUid();
    const docData = await documentHandler[docType](uid, docId);
    /**
     * attachment = force download
     * inline = open in browser PDF viewer
     */
    res.setHeader("Content-Disposition", `attachment; filename="${docData.filename}"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(docData.pdf);
  } catch (error) {
    next(error);
  }
}

function safeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}
