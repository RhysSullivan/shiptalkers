"use client";
import { ResponsiveTimeRange } from "@nivo/calendar";

const colors = ["#1DA1F2", "#eeeeee", "#28a745"];

const ticks = [-1000, 0, 1000];
const colorScaleFn = (value) => {
  if (value < 0) {
    return colors[0];
  }
  if (value == 0) {
    return colors[1];
  }
  for (let i = 2; i < ticks.length; i++) {
    if (value < ticks[i]) {
      return colors[i];
    }
  }
  return colors[colors.length - 1];
};

colorScaleFn.ticks = () => ticks;

export function ClientHeatmap(
  props: Parameters<typeof ResponsiveTimeRange>[0],
) {
  return <ResponsiveTimeRange colorScale={colorScaleFn} {...props} />;
}
