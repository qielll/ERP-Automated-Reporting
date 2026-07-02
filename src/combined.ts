import fetch from "node-fetch";
import * as dotenv from "dotenv";
import { google } from "googleapis";

// --- Types from src/types/odoo.type.ts ---
export type JsonRpcResponse<T> = {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: any;
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

// --- Config from src/config/config.ts ---
dotenv.config();

export const ENV = {
  ODOO_URL: process.env.ODOO_URL,
  DB: process.env.DB,
  USER: process.env.USER,
  API_KEY: process.env.API_KEY,
  GOOGLE_KEYFILE: process.env.GOOGLE_KEYFILE,
};

const auth = new google.auth.GoogleAuth({
  keyFile: ENV.GOOGLE_KEYFILE,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

export const sheets = google.sheets({
  version: "v4",
  auth,
});

// --- Odoo RPC from src/odoo/odooRpc.ts ---
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

export async function authenticate(): Promise<number> {
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

// --- Odoo Services from src/services/odooServices.ts ---
export async function getUserTag(userInput: string): Promise<string | null> {
  const uid = await authenticate();

  const users = await execute<UserSales[]>(uid, "x_sales_daily_report", "search_read", [[]], { fields: ["x_studio_salesperson_name"] });

  const found = users.find((u) => u.x_studio_salesperson_name.toLowerCase() === userInput.toLowerCase());

  return found ? found.x_studio_salesperson_name : null;
}

export async function getReports(uid: number, dates: string[], user: string | null): Promise<DailyReport[]> {
  return execute<DailyReport[]>(
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
      fields: ["x_studio_report_date", "x_studio_email_sent_today", "x_studio_email_sent_screenshots", "x_studio_email_sent_description"],
      order: "x_studio_report_date asc",
    },
  );
}

// --- Utils from src/utils/main.util.ts ---
export function getCountedWeek(weekInput: string, monthInput: string, yearInput: string): string[] {
  const year = parseInt(yearInput);
  const month = parseInt(monthInput);
  const week = parseInt(weekInput) - 1;

  const initialDate = new Date(Date.UTC(year, month, 1));

  if (week > 0) initialDate.setDate(initialDate.getDate() + 7 * week);

  const dates: string[] = [];
  const initialMonth = initialDate.getMonth();

  for (let i = 0; i < 7; i++) {
    const temp = new Date(initialDate);
    temp.setDate(temp.getDate() + i);

    if (temp.getMonth() !== initialMonth) break;

    dates.push(temp.toISOString().split("T")[0]);
  }

  return dates;
}

export function columnToLetter(col: number): string {
  let letter = "";
  while (col >= 0) {
    letter = String.fromCharCode((col % 26) + 65) + letter;
    col = Math.floor(col / 26) - 1;
  }
  return letter;
}

// --- Main execution from src/main.ts ---
(async () => {
  try {
    const uid = await authenticate();

    const user = await getUserTag("reno");
    const dates = getCountedWeek("3", "3", "2026");

    const records = await getReports(uid, dates, user);

    console.log(records);
  } catch (error) {
    console.error("Execution error:", error);
  }
})();
