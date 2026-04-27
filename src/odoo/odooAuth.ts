import { jsonRpc } from "./odooRpc";
import { ENV } from "../config/config";

export async function authenticate(): Promise<number> {
  return jsonRpc<number>({
    jsonrpc: "2.0",
    method: "call",
    params: {
      service: "common",
      method: "authenticate",
      args: [ENV.DB, ENV.USER, ENV.API_KEY, {}],
    },
    id: 1,
  });
}
