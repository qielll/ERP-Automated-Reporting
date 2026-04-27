import { execute, authenticate } from "../odoo/odooRpc";
import { UserSales, DailyReport } from "../types/odoo.type";

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
