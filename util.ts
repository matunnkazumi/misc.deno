import { datetime } from "https://deno.land/x/ptera@v1.0.2/mod.ts";

export function date_now_jst_format(): string {
  const jst_date = datetime().toZonedTime("Asia/Tokyo");
  return jst_date.format(`YYYYMMdd`);
}
