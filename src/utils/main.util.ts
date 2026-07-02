type DailyReport = {
  id?: number | null;
  x_studio_report_date: string;
  x_studio_email_sent_today: number | null;
  x_studio_email_sent_screenshots: string | null;
  x_studio_email_sent_description: string | null;
};

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

export const getMailSent = (selectedDates: string[], records: DailyReport[]) => {
  const normalizedData = selectedDates.map((date) => {
    // find() Returns the first item that matches the date
    const found = records.find((r) => r.x_studio_report_date === date);

    // If the data is found, return it
    if (found) return found;

    // If missing → return null structure for that specific date
    return {
      id: null,
      x_studio_report_date: date, // Using the date from the map directly
      x_studio_email_sent_today: null,
      x_studio_email_sent_screenshots: null,
      x_studio_email_sent_description: null,
    };
  });

  const validData: DailyReport[] = normalizedData.filter((item): item is DailyReport => item !== undefined && item.id !== null);
  // console.log(normalizedData);

  const emailSentTodayValues: number[] = validData.map((item) => item.x_studio_email_sent_today).filter((v): v is number => v !== null);
  return emailSentTodayValues;
};
