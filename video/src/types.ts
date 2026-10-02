import { z } from "zod";

export const ScenePropsSchema = z.object({
  frame: z.number().optional(),
  fps: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export type SceneProps = z.infer<typeof ScenePropsSchema>;

export type DeviceType = "macbook" | "iphone" | "ipad";

export interface DeviceMockupProps extends SceneProps {
  device: DeviceType;
  screenshot: string;
  tiltY?: number;
  tiltX?: number;
  scale?: number;
  x?: number;
  y?: number;
  rotateZ?: number;
  showReflection?: boolean;
  highlightBox?: { x: number; y: number; w: number; h: number };
}

export interface HighlightBoxProps {
  frame?: number;
  fps?: number;
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  delay?: number;
  pulse?: boolean;
}

export interface CursorProps extends SceneProps {
  x: number;
  y: number;
  clickAt?: number;
  color?: string;
}
