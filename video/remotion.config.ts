import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(4);
Config.setChromiumOpenGlRenderer("angle");
Config.setPixelFormat("yuv420p");
Config.setCodec("h264");

// Entry point
Config.setEntryPoint("./src/index.ts");
