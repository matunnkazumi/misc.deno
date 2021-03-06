import { $ } from "https://deno.land/x/zx_deno@1.2.2/mod.mjs";
import { date_now_jst_format, makeTempDir, makeTempFile } from "./util.ts";

const date_prefix = date_now_jst_format();

export interface RecomplessFile {
  srcFileName: string;
  newFileNameBase: string;
}
export interface ConvertOption {
  resize_width: number;
}

export async function jpeg_recompless(
  files: Array<RecomplessFile>,
  param: ConvertOption,
) {
  const temp_dir = await makeTempDir({
    prefix: "matunnkazumi-jpeg-tempdir",
  });

  await Deno.mkdir("./output");
  const conveters = files.map((file) => {
    return {
      srcFileName: file.srcFileName,
      newFileName: `output/${date_prefix}_${file.newFileNameBase}`,
    };
  }).map(async (file) => {
    const temp_file_name = await makeTempFile({ prefix: temp_dir + "/" });

    await $
      `convert -resize ${param.resize_width}x -quality 100 -unsharp 0x0.75+0.75+0.008 ${file.srcFileName} ${temp_file_name}`;
    await $`guetzli --quality 84 ${temp_file_name} ${file.newFileName}`;
    await $
      `exiftool -overwrite_original -UserComment="https://matunnkazumi.blog.fc2.com/" ${file.newFileName}`;
  });
  await Promise.all(conveters);

  await Deno.remove(temp_dir, { recursive: true });
}

function is_jpeg_file(entry: Deno.DirEntry) {
  if (!entry.isFile) {
    return false;
  }
  if (!entry.name.endsWith(".jpg")) {
    return false;
  }
  return true;
}

export async function same_basename_with_number(
  basename: string,
  option: ConvertOption = { resize_width: 920 },
) {
  const result = Array.from(Deno.readDirSync("./"))
    .filter(is_jpeg_file)
    .map((e) => e.name)
    .sort()
    .map((file, index) => {
      return {
        srcFileName: file,
        newFileNameBase: `${basename}_${index + 1}.jpg`,
      };
    });

  await jpeg_recompless(result, option);
}

export async function convert_file_name_mapping(
  mapping: Array<[string, string]>,
  option: ConvertOption = { resize_width: 920 },
) {
  const dict = mapping.map((m) => {
    return {
      srcFileName: m[0],
      newFileNameBase: m[1],
    };
  });
  await jpeg_recompless(dict, option);
}
