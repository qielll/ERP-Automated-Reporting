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
