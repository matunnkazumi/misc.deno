import { format } from "https://deno.land/std@0.77.0/datetime/mod.ts";

export function date_now_jst_format(): string {
  const jst_date = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return format(jst_date, `yyyyMMdd`);
}
