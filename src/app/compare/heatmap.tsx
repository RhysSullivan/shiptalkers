"use client";
import React from "react";
import { Group } from "@visx/group";
import genBins, { Bin, Bins } from "@visx/mock-data/lib/generators/genBins";
import { scaleLinear } from "@visx/scale";
import { HeatmapCircle, HeatmapRect } from "@visx/heatmap";
import { getSeededRandom } from "@visx/mock-data";

const darkGreenGitHubCommits = "#156a40";
const lightGreenGitHubCommits = "#39d353";
const darkBlueTweets = "#0f4c75";
const lightBlueTweets = "#3282b8";
export const background = "#28272c";

function max<Datum>(data: Datum[], value: (d: Datum) => number): number {
  return Math.max(...data.map(value));
}

function min<Datum>(data: Datum[], value: (d: Datum) => number): number {
  return Math.min(...data.map(value));
}

export type HeatmapProps = {
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  separation?: number;
  events?: boolean;
  data: {
    day: string;
    commits: number;
    tweets: number;
  }[][];
};

const defaultMargin = { top: 20, left: 0, right: 0, bottom: 0 };

export function HeatmapSized({
  width,
  height,
  events = false,
  data,
  margin = defaultMargin,
  separation = 20,
}: HeatmapProps) {
  const binData = data.map((section, index) => {
    return {
      bins: Array.from({ length: 7 }, (_, i) => {
        const tweets = (section[i]?.tweets ?? 0) * -1;
        const commits = section[i]?.commits ?? 0;
        return {
          count: tweets + commits,
          bin: i,
        };
      }),
      bin: index,
    };
  });
  // accessors
  const bins = (d: Bins) => d.bins;
  const count = (d: Bin) => d.count;

  const colorMax = max(binData, (d) => max(bins(d), count));
  const colorMin = min(binData, (d) => min(bins(d), count));
  const bucketSizeMax = max(binData, (d) => bins(d).length);

  // scales
  const xScale = scaleLinear<number>({
    domain: [0, binData.length],
  });
  const yScale = scaleLinear<number>({
    domain: [0, bucketSizeMax],
  });
  const colorScale = scaleLinear<string>({
    range: [
      lightGreenGitHubCommits,
      darkGreenGitHubCommits,
      darkBlueTweets,
      lightBlueTweets,
    ],
    domain: [colorMin, colorMax],
  });
  const opacityScale = scaleLinear<number>({
    range: [0.3, 1],
    domain: [0, colorMax],
  });
  // bounds
  const size =
    width > margin.left + margin.right
      ? width - margin.left - margin.right - separation
      : width;
  const xMax = size;
  const yMax = height - margin.bottom - margin.top;

  const binWidth = xMax / binData.length;
  console.log(colorScale(-50));
  xScale.range([0, xMax]);
  yScale.range([yMax, 0]);

  return (
    <svg
      width={width}
      height={height}
      className="overflow-scroll rounded-md border-2"
    >
      <Group top={margin.top - separation} left={margin.left + separation / 2}>
        <HeatmapRect
          xScale={(d) => xScale(d) ?? 0}
          yScale={(d) => xScale(d) ?? 0}
          colorScale={(d) => colorScale(d)}
          opacityScale={
            // if it's 0, make it .1
            (d) => {
              if (!d) return 0.1;
              // @ts-expect-error baaa
              if (d > 10) return 1;
              return opacityScale(d);
            }
          }
          data={binData}
          binWidth={binWidth}
          binHeight={binWidth}
          gap={4}
        >
          {(heatmap) =>
            heatmap.map((heatmapBins) =>
              heatmapBins.map((bin) => {
                const { commits, tweets } = data[bin.column]![bin.row]!;
                console.log(commits, tweets);
                return (
                  <rect
                    key={`heatmap-rect-${bin.row}-${bin.column}`}
                    className="visx-heatmap-rect "
                    width={bin.width}
                    height={bin.height}
                    x={bin.x}
                    y={bin.y}
                    opacity={bin.opacity}
                    fill={commits + tweets > 0 ? bin.color : "#000"}
                    onClick={() => {
                      if (!events) return;
                      const { row, column } = bin;
                      alert(
                        JSON.stringify({
                          row,
                          column,
                          bin: bin.bin,
                          commits,
                          tweets,
                        }),
                      );
                    }}
                  />
                );
              }),
            )
          }
        </HeatmapRect>
      </Group>
    </svg>
  );
}

import ParentSize from "@visx/responsive/lib/components/ParentSize";
export function Heatmap(props: Pick<HeatmapProps, "data">) {
  return (
    <ParentSize>
      {({ width, height }) => (
        <HeatmapSized width={width} height={height} events data={props.data} />
      )}
    </ParentSize>
  );
}
