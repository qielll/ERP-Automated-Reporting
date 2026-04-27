import fetch from "node-fetch";
import { JsonRpcResponse } from "../types/odoo.type";
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

export async function jsonRpc<T>(payload: object): Promise<T> {
  const res = await fetch(ENV.ODOO_URL as string, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data: JsonRpcResponse<T> = await res.json();

  if (data.error) {
    throw new Error(JSON.stringify(data.error, null, 2));
  }

  return data.result as T;
}

export async function execute<T>(uid: number, model: string, method: string, args: any[] = [], kwargs: object = {}): Promise<T> {
  return jsonRpc<T>({
    jsonrpc: "2.0",
    method: "call",
    params: {
      service: "object",
      method: "execute_kw",
      args: [ENV.DB, uid, ENV.API_KEY, model, method, args, kwargs],
    },
    id: 2,
  });
}
