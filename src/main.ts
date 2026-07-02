import express from "express";
import { getUserTag, getReports, authenticate } from "./services/odooServices";
import { getCountedWeek } from "./utils/main.util";
import { ENV } from "./config/config";
import cors from "cors";
import reportRoutes from "./routes/odooRoute";
import quotePdfRoutes from "./routes/quotePdfRoutes";

//cors setup

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
  }),
);

app.use(express.json());
const PORT = 3000;

//routes
app.use("/api", reportRoutes);
app.use("/api", quotePdfRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // const uid = authenticate();

  // (async () => {
  //   console.log(`Odoo API authenticate success`);

  //   const user = await getUserTag("reno");
  //   const dates = getCountedWeek("3", "3", "2026");

  //   const records = await getReports(uid, dates, user);

  //   console.log(records);
  // })();
});
