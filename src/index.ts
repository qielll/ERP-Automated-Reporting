// npm install node-fetch@2
import fetch from "node-fetch";
import * as dotenv from "dotenv";
import { google, sheets_v4 } from "googleapis";

dotenv.config();

// ---- Types ----

//Explanation:
//Using type because it need T (T in here is considered as argument)
// T is "generic", it means a placeholder that will be decided later (if its going to be String, Number etc)
type JsonRpcResponse<T> = {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: any; //put any as error type because error return can be anything
};

//Explanation:
//Using type because it need union "|"
//union is used because the return already expected to be null too
type DailyReport = {
  id?: number | null;
  x_studio_report_date: string;
  x_studio_email_sent_today: number | null;
  x_studio_email_sent_screenshots: string | null;
  x_studio_email_sent_description: string | null;
};

interface UserSales {
  id: number;
  x_studio_salesperson_name: string;
}

type AppendParams = {
  spreadsheetId: string;
  namedRange: string;
  data: number[];
};

// ---- RPC Core ----

//Explanation:
//putting <T> means the function will use generic type within it
//default format or structure of a function in typescript are adding type to-
//parameter and return
//Example: function addNumbers(a: number, b: number): number <- is the return type {}
async function jsonRpc<T>(payload: object): Promise<T> {
  //string in the ODOO_URl as first parameter of fetch (the default of 1st parameter of fetch is string)-
  //exist because type script enforce or contract fetch() first url to need to have a type
  const res = await fetch(process.env.ODOO_URL as string, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  //declare the result of the fetch (which the res.json/"data" variable) should look like JsonRpcResponse based on the type
  const data: JsonRpcResponse<T> = await res.json();

  if (data.error) {
    throw new Error(JSON.stringify(data.error, null, 2));
  }

  return data.result as T; //return type is set up with generic because the return type of function is a generic
}

// ---- Auth ----
//Explanation:
//adding return type as promise that returning number
async function authenticate(): Promise<number> {
  //adding jsonRpc<number> to make sure the return of jsonRpc function that are use for-
  // authenticate() are number, since jsonRpc already setted up as <T> or generic, it can be change to anything
  return jsonRpc<number>({
    jsonrpc: "2.0",
    method: "call",
    params: {
      service: "common",
      method: "authenticate",
      args: [process.env.DB, process.env.USER, process.env.API_KEY, {}],
    },
    id: 1,
  });
}

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_KEYFILE,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets: sheets_v4.Sheets = google.sheets({
  version: "v4",
  auth,
});

//google spreadsheet automation
// --- Helper: Convert column index → letter (0 → A)
function columnToLetter(col: number): string {
  let temp = "";
  let letter = "";

  while (col >= 0) {
    temp = String.fromCharCode((col % 26) + 65);
    letter = temp + letter;
    col = Math.floor(col / 26) - 1;
  }

  return letter;
}

export async function append7DaysDynamic({ spreadsheetId, namedRange, data }: AppendParams): Promise<void> {
  try {
    // 1. Get spreadsheet metadata (for named range)
    const meta = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const named = meta.data.namedRanges?.find((n) => n.name === namedRange);

    if (!named || !named.range) {
      throw new Error(`Named range "${namedRange}" not found`);
    }

    const grid = named.range;

    if (grid.startColumnIndex == null || grid.startRowIndex == null || grid.sheetId == null) {
      throw new Error("Invalid named range structure");
    }

    // 2. Resolve sheet name from sheetId
    const sheet = meta.data.sheets?.find((s) => s.properties?.sheetId === grid.sheetId);

    const sheetName = sheet?.properties?.title;

    if (!sheetName) {
      throw new Error("Sheet name not found");
    }

    // 3. Convert column index → letter
    const columnLetter = columnToLetter(grid.startColumnIndex);

    // 4. Determine start row (named range start)
    const baseRow = (grid.startRowIndex ?? 0) + 1;

    // 5. Read existing values in named range
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: namedRange,
    });

    const values: string[][] = res.data.values ?? [];

    // 6. Find first empty row
    let firstEmptyIndex = values.findIndex((row) => !row || !row[0]);

    if (firstEmptyIndex === -1) {
      firstEmptyIndex = values.length;
    }

    // 7. Calculate write range
    const startRow = baseRow + firstEmptyIndex;
    const endRow = startRow + data.length - 1;

    const writeRange = `${sheetName}!${columnLetter}${startRow}:${columnLetter}${endRow}`;

    // 8. Format data
    const formattedValues: (string | number)[][] = data.map((v) => [v]);

    // 9. Write to sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: writeRange,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: formattedValues,
      },
    });

    console.log(`✅ Wrote to ${writeRange}`);
  } catch (error: unknown) {
    console.error("❌ Error:", error);
    throw error;
  }
}

// ---- Execute ----
//explanation note:
//function to execute RPC for running method like read update delete from Odoo API
//basically a format to retrieve, delete, update data or any action regarding data in Odoo db
//args and kwargs have default value is equal to optional type like "args?: any[]" or "kwargs?: object"
async function execute<T>(uid: number, model: string, method: string, args: any[] = [], kwargs: object = {}): Promise<T> {
  return jsonRpc<T>({
    jsonrpc: "2.0",
    method: "call",
    params: {
      service: "object",
      method: "execute_kw",
      args: [process.env.DB, uid, process.env.API_KEY, model, method, args, kwargs],
    },
    id: 2,
  });
}

// ---- Get User tag input ----

async function getUserTag(userInput: string): Promise<string | null> {
  const uid = await authenticate();

  const user_arr = await execute<UserSales[]>(uid, "x_sales_daily_report", "search_read", [[]], { fields: ["x_studio_salesperson_name"] });
  const choosedUser: UserSales | undefined = user_arr.find((data) => userInput.toLocaleLowerCase() === data.x_studio_salesperson_name.toLocaleLowerCase());
  if (choosedUser) return choosedUser.x_studio_salesperson_name;
  else return null;
}

// ---- Get choosed week input ----

function getCountedWeek(weekInput: string, monthInput: string, yearInput: string): string[] {
  //input from param should be number 1-5 representing which week of the month is choosen-
  //and month number 0-11 (zero index) representing which month

  //get the first date of the month based on the user input +++can be refactored into function+++
  const yearInStr = parseInt(yearInput);
  const monthInstr = parseInt(monthInput);
  const weekInStr = parseInt(weekInput) - 1;
  const initialDate = new Date(Date.UTC(yearInStr, monthInstr, 1));

  //changing initial date based on requested week data formula (1st day of choosen month + 7 * (n(week request)-1) )
  if (parseInt(weekInput) > 1) initialDate.setDate(initialDate.getDate() + 7 * weekInStr);
  console.log(initialDate);
  //format the first date YYYY-MM-DDTHH:mm:ss.sssZ by removing the THH:mm:ss.sssZ-
  //and become yyyy-mm-dd
  initialDate.toISOString().split("T")[0];

  const dateArr: string[] = [];

  //need to review this
  const initialMonth = initialDate.getMonth();
  for (let i = 0; i < 7; i++) {
    // 2. Create a fresh copy of the initial date
    const tempDate = new Date(initialDate);
    tempDate.setDate(tempDate.getDate() + i);

    // 3. Add 'i' days to that date
    if (tempDate.getMonth() !== initialMonth) {
      return dateArr;
    }
    const formatted = tempDate.toISOString().split("T")[0];
    dateArr.push(formatted);
  }

  // const year = parseInt(weekInput.slice(0, 4)); // to extract yyyy
  // const month = parseInt(weekInput.slice(5, 7).replace("0", "")); // to extract month
  // const day = parseInt(weekInput.slice(8)); // to extract dd

  return dateArr;
}

//google spreadsheet automation codes

// ---- Main Logic ----
//Explanation note:
//this is IIFE (Immediately Invoked Function Expression)
// function that runs as soon as it is defined
(async () => {
  try {
    //authentication
    const uid = await authenticate();

    //get user tag
    //code the looping for check the validated on missing data based on date
    const userTest = await getUserTag("reno");

    //get week date
    const selectedDates = getCountedWeek("3", "3", "2026");

    //get raw data with both filter week and usertag
    const records = await execute<DailyReport[]>(
      uid,
      "x_sales_daily_report",
      "search_read",
      [
        [
          ["x_studio_report_date", "in", selectedDates],
          ["x_studio_salesperson_name", "in", [userTest]],
        ],
      ],
      {
        fields: ["x_studio_report_date", "x_studio_email_sent_today", "x_studio_email_sent_screenshots", "x_studio_email_sent_description"],
        order: "x_studio_report_date asc",
      },
    );

    // normalize result to ensure all selected dates exist or null
    //loop through selected date that will be retrieved
    const normalizedData: (DailyReport | undefined)[] = selectedDates.map((date, i) => {
      //find() Returns the first item that matches a condition
      const found = records.find((r) => r.x_studio_report_date === date);

      //if the data found, return the data and put it on "normalized" variable array
      if (found) return found;

      // if missing → return null structure
      return {
        id: null,
        x_studio_report_date: selectedDates[i],
        x_studio_email_sent_today: null,
        x_studio_email_sent_screenshots: null,
        x_studio_email_sent_description: null,
      };
    });

    //learn ts
    const validData: DailyReport[] = normalizedData.filter((item): item is DailyReport => item !== undefined && item.id !== null);
    console.log(normalizedData);

    const emailSentTodayValues: number[] = validData.map((item) => item.x_studio_email_sent_today).filter((v): v is number => v !== null);

    validData.length > 0 ? console.log(`Valid data that will be inputted:\n${JSON.stringify(validData, null, 2)}`) : console.log(`There is no valid data`);
    await append7DaysDynamic({
      spreadsheetId: "1-Yc3f7pHDobz2JwebwuRkpaGwfulW0jrtPnG3-EuB20",
      namedRange: `${userTest?.toLocaleLowerCase()}_3w_apr_data`,
      data: emailSentTodayValues,
    });
  } catch (err: any) {
    console.error("Error:", err.message);
  }
})();
