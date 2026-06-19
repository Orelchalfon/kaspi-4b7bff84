import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// H.264 MP4 is the safest target for social platforms.
Config.setCodec("h264");
