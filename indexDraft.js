// Install: npm install node-fetch@2
const fetch = require("node-fetch");
require("dotenv").config();

// Generic JSON-RPC caller
async function jsonRpc(payload) {
  const res = await fetch(process.env.ODOO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (data.error) {
    throw new Error(JSON.stringify(data.error, null, 2));
  }

  return data.result;
}

// Step 1: authenticate → get uid
async function authenticate() {
  return jsonRpc({
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

// Step 2: call model methods
async function execute(uid, model, method, args = [], kwargs = {}) {
  return jsonRpc({
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

// Test: get users (res.users model)
(async () => {
  try {
    const uid = await authenticate();

    // console.log("Authenticated UID:", uid);

    const records = await execute(
      uid,
      "x_sales_daily_report",
      "search_read",
      [
        [
          ["x_studio_report_date", "in", ["2026-04-15", "2026-04-16", "2026-04-17"]],
          ["x_studio_salesperson_name", "in", ["Reno"]],
        ],
      ],
      {
        fields: ["x_studio_report_date", "x_studio_email_sent_today", "x_studio_email_sent_screenshots", "x_studio_email_sent_description"],
        order: "x_studio_report_date asc",
      },
    );

    records.map((record) => {
      const selected_date = ["2026-04-15", "2026-04-16", "2026-04-17"];
      record.x_studio_report_date;
    });

    // const users = await execute(uid, "res.users", "search_read", [], {
    //   fields: ["id", "name", "login", "email"],
    //   limit: 10,
    // });

    // console.log("Users data:");
    // console.log(users);

    // const users = await execute(uid, "crm.lead", "search_read", [], {
    //   fields: ["id", "name", "stage_id"],
    // });

    console.log(records);
  } catch (err) {
    console.error("Error:", err.message);
  }
})();
