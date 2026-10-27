import "server-only";
import { mapDatabaseError } from "@/lib/db/errors";
import type { RpcObject } from "@/lib/db/types";
import { isRecord } from "@/lib/utils";
import { getAdminClient } from "@/lib/supabase/admin";

export async function callRpc(name: string, args: Record<string, unknown> = {}): Promise<RpcObject> {
  const { data, error } = await getAdminClient().rpc(name, args);
  if (error) throw mapDatabaseError(error);
  return isRecord(data) ? (data as RpcObject) : {};
}

export function rpcString(result: RpcObject, key: string): string | null {
  const value = result[key];
  return typeof value === "string" ? value : null;
}

export function rpcNumber(result: RpcObject, key: string): number | null {
  const value = result[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
