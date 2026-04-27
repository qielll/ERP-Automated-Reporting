import * as dotenv from "dotenv";
import { google, sheets_v4 } from "googleapis";
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
