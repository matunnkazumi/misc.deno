import { ensureDir } from "jsr:@std/fs@^0.229.1";
import { pooledMap } from "jsr:@std/async@^0.224.1";
import { $ } from "npm:zx@8.1.2";

export interface RecomplessFile {
  srcFileName: string;
  newFileNameBase: string;
  option?: {
    to?: string;
  };
}

type CodecOption = {
  vcodec: "lossless" | "h265";
} | {
  vcodec: "h265_vaapi";
  device: string;
} | {
  vcodec: "av1";
  preset: number;
};

export type ConvertOption =
  & ({
    crop: {
      width: number;
      height: number;
      left: number;
      top: number;
    };
    aspect?: string;
    concurrentLimit?: number;
  })
  & CodecOption;

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
      const vcodec = param.vcodec;
      const aspect = param.aspect ? ["-aspect", param.aspect] : [];

      if (vcodec == "lossless") {
        await $`ffmpeg -i ${file.srcFileName} ${toOpt} ${toParam} -vf ${filters} ${aspect} -c:v utvideo -c:a flac  ${file.newFileName}`;
      } else if (vcodec == "h265") {
        // https://life.craftz.dog/entry/save-storage-with-h265-ffmpeg
        await $`ffmpeg -i ${file.srcFileName} ${toOpt} ${toParam} -vf ${filters} ${aspect} -c:v libx265 -crf 18 -b:v 0 -tag:v hvc1 -c:a aac -b:a 320k ${file.newFileName}`;
      } else if (vcodec == "h265_vaapi") {
        const device = param.device;
        const vf = `${filters},format=nv12,hwupload`;
        await $`ffmpeg -vaapi_device ${device} -i ${file.srcFileName} ${toOpt} ${toParam} -vf ${vf} ${aspect} -c:v hevc_vaapi -qp 23 -rc_mode CQP -tag:v hvc1 -c:a aac -b:a 320k ${file.newFileName}`;
      } else if (vcodec == "av1") {
        const preset = ("preset" in param) ? param.preset : 5;
        // https://gitlab.com/AOMediaCodec/SVT-AV1/-/blob/master/Docs/Ffmpeg.md
        await $`ffmpeg -i ${file.srcFileName} ${toOpt} ${toParam} -vf ${filters} ${aspect} -c:v libsvtav1 -preset ${preset} -crf 32 -g 240 -pix_fmt yuv420p10le -svtav1-params tune=0 -c:a libopus -b:a 320k ${file.newFileName}`;
      }
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
