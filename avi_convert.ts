import { ensureDir } from "https://deno.land/std@0.126.0/fs/mod.ts";
import { pooledMap } from "https://deno.land/std@0.126.0/async/mod.ts";
import { $ } from "https://deno.land/x/zx_deno@1.2.2/mod.mjs";

export interface RecomplessFile {
  srcFileName: string;
  newFileNameBase: string;
  option?: {
    to?: string;
  };
}
export interface ConvertOption {
  crop: {
    width: number;
    height: number;
    left: number;
    top: number;
  };
  acodec: string;
  vcodec: string;
  concurrentLimit?: number;
}

async function avi_recompless(
  files: Array<RecomplessFile>,
  param: ConvertOption,
) {
  await ensureDir("./output");

  const outputFileDict = files.map((file) => {
    return {
      srcFileName: file.srcFileName,
      newFileName: `output/${file.newFileNameBase}`,
      option: file.option,
    };
  });

  const results = pooledMap(
    param.concurrentLimit ?? 10,
    outputFileDict,
    async (file) => {
      const toOpt = file.option?.to ? `-to` : "";
      const toParam = file.option?.to ? `${file.option.to}` : "";
      const filters =
        `crop=${param.crop.width}:${param.crop.height}:${param.crop.left}:${param.crop.top}`;
      const acodec = param.acodec;
      const vcodec = param.vcodec;

      await $
        `ffmpeg -i ${file.srcFileName} ${toOpt} ${toParam} -vf ${filters} -acodec ${acodec} -vcodec ${vcodec} ${file.newFileName}`;
    },
  );

  for await (const _ of results) {
    console.log("finish");
  }
}

export type Mapping = Array<[string, string] | [string, string, string]>;

export async function convert_file_name_mapping(
  mappings: Mapping,
  option: ConvertOption,
) {
  const dict = mappings.map((m) => {
    return {
      srcFileName: m[0],
      newFileNameBase: m[1],
      option: {
        to: m[2],
      },
    };
  });
  await avi_recompless(dict, option);
}
