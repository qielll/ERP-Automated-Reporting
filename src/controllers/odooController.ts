import { Request, Response } from "express";
import { getReports, authenticate, getUserTag, writeSpreadsheet } from "../services/odooServices";
import { getCountedWeek } from "../utils/main.util";
import { GenerateReportBody } from "../types/report.type";
import { getCachedUid, getCachedUser } from "../services/authServices";

let userCache;
export const generateReport = async (req: Request<{}, GenerateReportBody>, res: Response) => {
  try {
    const { week, month, year, user } = req.body;
    const uid = await getCachedUid();
    const dates = getCountedWeek(week, month, year);
    const userTag = await getCachedUser(user);

    const result = await getReports(uid, dates, userTag);

    return res.status(200).json({
      success: true,
      count: result.dailyMail.length,
      data: result,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Startup job failed:", error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
    // Handle cases where something else was thrown
    // return res.status(500).json({ success: false, message: "An unknown error occurred" });
  }
};

export const writeEmailSent = async (req: Request, res: Response) => {
  try {
    const { dates, user, emailSentVal } = req.body;
    const userTag = await getCachedUser(user);
    writeSpreadsheet(dates, emailSentVal, user);
    return res.status(200).json({
      success: true,
      message: "Data successfully written to spreadsheet",
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Write to spreadsheet failed:", error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "An unknown error occurred" });
  }
};
