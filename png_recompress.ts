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

async function image_width(file_path: string): Promise<number> {
  const result = await $`identify -format "%w" ${file_path}`;
  return parseInt(result.stdout);
}

export async function png_recompless(
  files: Array<RecomplessFile>,
  param: ConvertOption,
) {
  const temp_dir = await makeTempDir({
    prefix: "matunnkazumi-png-tempdir",
  });

  await Deno.mkdir("./output");
  const conveters = files.map((file) => {
    return {
      srcFileName: file.srcFileName,
      newFileName: `output/${date_prefix}_${file.newFileNameBase}`,
    };
  }).map(async (file) => {
    const width = await image_width(file.srcFileName);

    const temp_file_resize = await makeTempFile({
      prefix: temp_dir + "/",
    });
    if (width > param.resize_width) {
      await $
        `convert -crop 1920x1080+220+0 -resize ${param.resize_width}x -quality 100 -unsharp 0x0.75+0.75+0.008 ${file.srcFileName} ${temp_file_resize}`;
    } else {
      await Deno.copyFile(file.srcFileName, temp_file_resize);
    }

    const temp_file_pngquant = await makeTempFile({
      prefix: temp_dir + "/",
    });
    // https://qiita.com/thanks2music@github/items/309700a411652c00672a
    // 圧縮率は最高で、圧縮前の画像を残さない
    await $
      `pngquant --force --speed 1 ${temp_file_resize} --output ${temp_file_pngquant}`;

    const temp_file_pngcrush = await makeTempFile({
      prefix: temp_dir + "/",
    });
    await $
      `pngcrush -force -nofilecheck -text b "Comment" "https://matunnkazumi.blog.fc2.com" ${temp_file_pngquant} ${temp_file_pngcrush}`;

    await $
      `zopflipng -y -m --keepchunks=tEXt ${temp_file_pngcrush} ${file.newFileName}`;
  });
  await Promise.all(conveters);

  await Deno.remove(temp_dir, { recursive: true });
}

function is_jpeg_file(entry: Deno.DirEntry) {
  if (!entry.isFile) {
    return false;
  }
  if (!entry.name.endsWith(".png")) {
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
        newFileNameBase: `${basename}_${index + 1}.png`,
      };
    });

  await png_recompless(result, option);
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
  await png_recompless(dict, option);
}
