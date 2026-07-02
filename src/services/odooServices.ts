// import { execute, authenticate } from "../odoo/odooRpc";
import { UserSales, DailyReport, SaleOrderQuoteData, OdooSaleOrder, OdooSaleOrderLine, QuoteLineGroup, OdooCompany, OdooPartner } from "../types/odoo.type";
import fetch from "node-fetch";
import { JsonRpcResponse } from "../types/odoo.type";
import { ENV } from "../config/config";
import { getMailSent } from "../utils/main.util";
import { append7DaysDynamic } from "../utils/integration.util";

type ReportsResult = {
  dailyMail: DailyReport[];
  emailSentValues: number[];
};

export async function authenticate(): Promise<number> {
  try {
    return jsonRpc<number>({
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "common",
        method: "authenticate",
        args: [ENV.DB, ENV.USER, ENV.API_KEY, {}],
      },
      id: 1,
    });
  } catch (error) {
    console.error("Startup job failed:", error);
    throw error;
  }
}

// export async function startupFunction(): Promise<Number> {
//   try {
//     const uid = await authenticate();

//     // Ensure the result is actually a number
//     const numericUid = Number(uid);

//     if (isNaN(numericUid)) {
//       throw new Error("Authentication returned an invalid UID");
//     }

//     console.log(`Odoo API authenticate success. UID: ${numericUid}`);
//     return numericUid;
//   } catch (error) {
//     console.error("Startup job failed:", error);
//     throw error;
//   }
// }

export async function jsonRpc<T>(payload: object): Promise<T> {
  const res = await fetch(ENV.ODOO_URL as string, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data: JsonRpcResponse<T> = await res.json();

  if (data.error) {
    throw new Error(JSON.stringify(data.error, null, 2));
  }

  return data.result as T;
}

export async function execute<T>(uid: number, model: string, method: string, args: any[] = [], kwargs: object = {}): Promise<T> {
  return jsonRpc<T>({
    jsonrpc: "2.0",
    method: "call",
    params: {
      service: "object",
      method: "execute_kw",
      args: [ENV.DB, uid, ENV.API_KEY, model, method, args, kwargs],
    },
    id: 2,
  });
}

export async function getUserTag(userInput: string): Promise<string | null> {
  const uid = await authenticate();

  const users = await execute<UserSales[]>(uid, "x_sales_daily_report", "search_read", [[]], { fields: ["x_studio_salesperson_name"] });

  const found = users.find((u) => u.x_studio_salesperson_name.toLowerCase() === userInput.toLowerCase());

  return found ? found.x_studio_salesperson_name : null;
}

export async function getReports(uid: number, dates: string[], user: string | null): Promise<ReportsResult> {
  const dailyMail = await execute<DailyReport[]>(
    uid,
    "x_sales_daily_report",
    "search_read",
    [
      [
        ["x_studio_report_date", "in", dates],
        ["x_studio_salesperson_name", "in", [user]],
      ],
    ],
    {
      fields: ["x_studio_report_date", "x_studio_email_sent_today"],
      order: "x_studio_report_date asc",
    },
  );

  const emailSentValues = getMailSent(dates, dailyMail);

  return {
    dailyMail,
    emailSentValues,
  };
}

export async function writeSpreadsheet(dates: string[], emailSentVal: number[], user: string) {
  try {
    append7DaysDynamic({
      spreadsheetId: "1-Yc3f7pHDobz2JwebwuRkpaGwfulW0jrtPnG3-EuB20",
      namedRange: `${user?.toLocaleLowerCase()}_3w_apr_data`,
      data: emailSentVal,
    });
  } catch (error) {}
}

export async function getSaleOrderQuoteData(uid: number, saleOrderId: number): Promise<SaleOrderQuoteData> {
  const orders = await execute<OdooSaleOrder[]>(uid, "sale.order", "read", [[saleOrderId]], {
    fields: ["id", "name", "state", "date_order", "validity_date", "partner_id", "company_id", "currency_id", "user_id", "amount_untaxed", "amount_tax", "amount_total", "order_line", "note", "payment_term_id"],
  });

  const order = orders[0];

  if (!order) {
    throw new Error(`Sales Order with ID ${saleOrderId} was not found`);
  }

  const partnerId = Array.isArray(order.partner_id) ? order.partner_id[0] : null;
  const companyId = Array.isArray(order.company_id) ? order.company_id[0] : null;

  const partner = partnerId
    ? ((
        await execute<OdooPartner[]>(uid, "res.partner", "read", [[partnerId]], {
          fields: ["id", "name", "street", "street2", "city", "zip", "state_id", "country_id", "contact_address", "vat"],
        })
      )[0] ?? null)
    : null;

  const company = companyId
    ? ((
        await execute<OdooCompany[]>(uid, "res.company", "read", [[companyId]], {
          fields: ["id", "name", "street", "street2", "city", "zip", "country_id", "phone", "email", "website", "vat", "logo"],
        })
      )[0] ?? null)
    : null;

  const lines = await execute<OdooSaleOrderLine[]>(uid, "sale.order.line", "read", [order.order_line], {
    fields: ["id", "sequence", "display_type", "name", "product_id", "product_uom_qty", "product_uom_id", "price_unit", "discount", "price_subtotal", "price_total"],
  });

  lines.sort((a, b) => a.sequence - b.sequence || a.id - b.id);

  return {
    order,
    partner,
    company,
    lines,
    groupedLines: groupProductLinesWithNotes(lines),
  };
}

export async function getInvoiceData(uid: number, dataId: number): Promise<SaleOrderQuoteData> {
  const orders = await execute<OdooSaleOrder[]>(uid, "account.move", "read", [[dataId]], {
    fields: [
      "id",
      "name",
      "state",
      "invoice_date",
      "invoice_date_due",
      "partner_id",
      "company_id",
      "currency_id",
      "invoice_user_id",
      "amount_untaxed",
      "amount_tax",
      "amount_total",
      "invoice_line_ids",
      "invoice_payment_term_id",
      "payment_state",
      "move_type",
    ],
  });

  const order = orders[0];

  if (!order) {
    throw new Error(`Sales Order with ID ${dataId} was not found`);
  }

  const partnerId = Array.isArray(order.partner_id) ? order.partner_id[0] : null;
  const companyId = Array.isArray(order.company_id) ? order.company_id[0] : null;

  const partner = partnerId
    ? ((
        await execute<OdooPartner[]>(uid, "res.partner", "read", [[partnerId]], {
          fields: ["id", "name", "street", "street2", "city", "zip", "state_id", "country_id", "contact_address", "vat"],
        })
      )[0] ?? null)
    : null;

  const company = companyId
    ? ((
        await execute<OdooCompany[]>(uid, "res.company", "read", [[companyId]], {
          fields: ["id", "name", "street", "street2", "city", "zip", "country_id", "phone", "email", "website", "vat", "logo"],
        })
      )[0] ?? null)
    : null;

  const lines = await execute<OdooSaleOrderLine[]>(uid, "sale.order.line", "read", [order.order_line], {
    fields: ["id", "sequence", "display_type", "name", "product_id", "product_uom_qty", "product_uom_id", "price_unit", "discount", "price_subtotal", "price_total"],
  });

  lines.sort((a, b) => a.sequence - b.sequence || a.id - b.id);

  return {
    order,
    partner,
    company,
    lines,
    groupedLines: groupProductLinesWithNotes(lines),
  };
}

function groupProductLinesWithNotes(lines: OdooSaleOrderLine[]): QuoteLineGroup[] {
  const groupedLines: QuoteLineGroup[] = [];

  for (const line of lines) {
    if (line.display_type === "line_section") {
      groupedLines.push({
        type: "section",
        title: line.name,
      });
      continue;
    }

    if (line.display_type === "line_note") {
      const previousGroup = groupedLines[groupedLines.length - 1];

      if (previousGroup?.type === "product") {
        previousGroup.notes.push(line);
      } else {
        groupedLines.push({
          type: "section",
          title: line.name,
        });
      }

      continue;
    }

    groupedLines.push({
      type: "product",
      line,
      notes: [],
    });
  }

  return groupedLines;
}
