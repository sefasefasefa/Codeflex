import { randomBytes } from "crypto";

export function generateId(prefix?: string): string {
  const id = randomBytes(8).toString("hex");
  return prefix ? `${prefix}_${id}` : id;
}
