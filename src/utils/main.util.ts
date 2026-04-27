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
