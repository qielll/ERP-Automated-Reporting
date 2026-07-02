export type JsonRpcResponse<T> = {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

export type OdooMany2One = [number, string] | false;

export type OdooPartner = {
  id: number;
  name: string;
  street?: string;
  street2?: string;
  city?: string;
  zip?: string;
  state_id?: OdooMany2One;
  country_id?: OdooMany2One;
  contact_address?: string;
  vat?: string;
};

export type OdooCompany = {
  id: number;
  name: string;
  street?: string;
  street2?: string;
  city?: string;
  zip?: string;
  country_id?: OdooMany2One;
  phone?: string;
  email?: string;
  website?: string;
  vat?: string;
  logo?: string;
};

export type OdooSaleOrder = {
  id: number;
  name: string;
  state: string;
  date_order: string;
  validity_date?: string;
  partner_id: OdooMany2One;
  company_id: OdooMany2One;
  currency_id: OdooMany2One;
  user_id: OdooMany2One;
  amount_untaxed: number;
  amount_tax: number;
  amount_total: number;
  order_line: number[];
  note?: string;
  payment_term_id?: OdooMany2One;
};

export type OdooSaleOrderLine = {
  id: number;
  sequence: number;
  display_type: false | "line_section" | "line_note";
  name: string;
  product_id: OdooMany2One;
  product_uom_qty: number;
  product_uom?: OdooMany2One;
  product_uom_id?: OdooMany2One;
  price_unit: number;
  discount: number;
  price_subtotal: number;
  price_total: number;
};

export type QuoteLineGroup =
  | {
      type: "section";
      title: string;
    }
  | {
      type: "product";
      line: OdooSaleOrderLine;
      notes: OdooSaleOrderLine[];
    };

export type SaleOrderQuoteData = {
  order: OdooSaleOrder;
  partner: OdooPartner | null;
  company: OdooCompany | null;
  lines: OdooSaleOrderLine[];
  groupedLines: QuoteLineGroup[];
};

export type DailyReport = {
  id?: number | null;
  x_studio_report_date: string;
  x_studio_email_sent_today: number | null;
  x_studio_email_sent_screenshots: string | null;
  x_studio_email_sent_description: string | null;
};

export interface UserSales {
  id: number;
  x_studio_salesperson_name: string;
}

export type AppendParams = {
  spreadsheetId: string;
  namedRange: string;
  data: number[];
};
