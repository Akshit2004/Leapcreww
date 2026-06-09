import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(4);
// h264 in an .mp4 container, high quality.
Config.setCodec("h264");
Config.setCrf(18);
