import { AppendParams } from "../types/odoo.type";
import { sheets } from "../config/config";
import { columnToLetter } from "./main.util";

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
