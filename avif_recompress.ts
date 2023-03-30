import {
  date_now_jst_format,
  image_width,
  makeTempFile,
  useTempDir,
} from "./util.ts";

const date_prefix = date_now_jst_format();

export interface RecomplessFile {
  srcFileName: string;
  newFileNameBase: string;
}
export interface ConvertOption {
  resize_width: number;
  crop?: {
    width: number;
    height: number;
    left: number;
    top: number;
  } | null;
}

function require_convert(width: number, option: ConvertOption): boolean {
  if (width > option.resize_width) {
    return true;
  }
  if (option.crop) {
    return true;
  }
  return false;
}

async function call_resize_and_crop(
  srcFileName: ReadableStream<Uint8Array>,
  width: number,
  param: ConvertOption,
) {
  if (require_convert(width, param)) {
    const args = [];
    args.push("-");
    if (param.crop) {
      args.push("-crop");
      args.push(
        `${param.crop.width}x${param.crop.height}+${param.crop.left}+${param.crop.top}`,
      );
    }
    if (width > param.resize_width) {
      args.push("-resize");
      args.push(`${param.resize_width}x`);
    }
    args.push(
      "-quality",
      "100",
      "-unsharp",
      "0x0.75+0.75+0.008",
      "-",
    );

    const command = new Deno.Command(
      "convert",
      {
        args: args,
        stdin: "piped",
        stdout: "piped",
      },
    );

    const child = command.spawn();
    await srcFileName.pipeTo(child.stdin);

    console.log("converted");
    return child.stdout;
  } else {
    console.log("no converted");
    return srcFileName;
  }
}

async function call_avifenc(
  temp_dir: string,
  srcFile: ReadableStream<Uint8Array>,
  destFileName: string,
) {
  const temp_file_src = await makeTempFile({
    prefix: temp_dir + "/",
  });

  const file = await Deno.open(temp_file_src, {
    create: true,
    write: true,
    truncate: true,
  });
  await srcFile.pipeTo(file.writable);
  (new Deno.Command(
    "avifenc",
    {
      args: [
        "-s",
        "0",
        temp_file_src,
        destFileName,
      ],
    },
  )).outputSync();
}

export async function avif_recompless(
  files: Array<RecomplessFile>,
  param: ConvertOption,
) {
  await useTempDir(async (temp_dir) => {
    const conveters = files.map((file) => {
      return {
        srcFileName: file.srcFileName,
        newFileName: `output/${date_prefix}_${file.newFileNameBase}`,
      };
    }).map(async (file) => {
      await Deno.mkdir("./output", { recursive: true });

      const width = await image_width(file.srcFileName);
      console.log(`${file.srcFileName}: ${width}px`);
      const srcStream = (await Deno.open(file.srcFileName)).readable;

      console.log(`convert ${file.srcFileName}`);
      const resized = await call_resize_and_crop(srcStream, width, param);
      console.log(`avifenc ${file.srcFileName}`);
      await call_avifenc(temp_dir, resized, file.newFileName);
    });
    await Promise.all(conveters);
  });
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
  option: ConvertOption = {
    resize_width: 920,
    crop: { width: 1920, height: 1080, left: 220, top: 0 },
  },
) {
  const result = Array.from(Deno.readDirSync("./"))
    .filter(is_jpeg_file)
    .map((e) => e.name)
    .sort()
    .map((file, index) => {
      return {
        srcFileName: file,
        newFileNameBase: `${basename}_${index + 1}.avif`,
      };
    });

  await avif_recompless(result, option);
}

export async function convert_file_name_mapping(
  mapping: Array<[string, string]>,
  option: ConvertOption = {
    resize_width: 920,
    crop: { width: 1920, height: 1080, left: 220, top: 0 },
  },
) {
  const dict = mapping.map((m) => {
    return {
      srcFileName: m[0],
      newFileNameBase: m[1],
    };
  });
  await avif_recompless(dict, option);
}
