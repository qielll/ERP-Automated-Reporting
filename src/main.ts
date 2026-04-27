import { authenticate } from "./odoo/odooRpc";
import { getUserTag, getReports } from "./services/odooServices";
import { getCountedWeek } from "./utils/main.util";
import { ENV } from "./config/config";

(async () => {
  const uid = await authenticate();

  const user = await getUserTag("reno");
  const dates = getCountedWeek("3", "3", "2026");

  const records = await getReports(uid, dates, user);

  console.log(records);
})();
