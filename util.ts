import { datetime } from "https://deno.land/x/ptera@v1.0.2/mod.ts";

export function date_now_jst_format(): string {
  const jst_date = datetime().toZonedTime("Asia/Tokyo");
  return jst_date.format(`YYYYMMdd`);
}

import { ensureDir } from "https://deno.land/std@0.130.0/fs/mod.ts";

export type MakeTempDirOptions = {
  prefix: string;
};

export async function makeTempDir(option?: MakeTempDirOptions) {
  const random = crypto.randomUUID();
  const dirName = (option?.prefix ?? "") + random;
  await ensureDir(dirName);
  return dirName;
}

export type MakeTempFileOptions = {
  prefix: string;
};

export async function makeTempFile(option?: MakeTempDirOptions) {
  const random = crypto.randomUUID();
  const fileName = (option?.prefix ?? "") + random;

  await Deno.create(fileName);

  return fileName;
}

export async function useTempDir(work: (dir: string) => Promise<void>) {
  const temp_dir = await makeTempDir({
    prefix: "matunnkazumi-png-tempdir",
  });

  await Deno.mkdir("./output", { recursive: true });

  try {
    await work(temp_dir);
  } finally {
    await Deno.remove(temp_dir, { recursive: true });
  }
}

export async function image_width(file_path: string): Promise<number> {
  const command = new Deno.Command("identify", {
    args: ["-format", "%w", file_path],
  });
  const { stdout } = await command.output();
  const output = new TextDecoder().decode(stdout);
  const width = parseInt(output);
  return width;
}
