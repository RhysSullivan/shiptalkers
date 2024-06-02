"use client";
import React from "react";
import { Group } from "@visx/group";
import type { Bin, Bins } from "@visx/mock-data/lib/generators/genBins";
import { scaleLinear } from "@visx/scale";
import { HeatmapRect } from "@visx/heatmap";

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
  data: TweetCommitData[];
};

const defaultMargin = { top: 20, left: 0, right: 0, bottom: 0 };

// accessors
const bins = (d: Bins) => d.bins;
const count = (d: Bin) => d.count;

function getStuff(args: {
  data: {
    day: string;
    commits: number;
    tweets: number;
  }[][];
  getProperty: (d: { day: string; commits: number; tweets: number }) => number;
  colorScale: string[];
}) {
  const { data, getProperty } = args;
  const binData = data.map((section, index) => {
    return {
      bins: Array.from({ length: 7 }, (_, i) => {
        const point = section[i];
        return {
          count: point ? getProperty(point) : 0,
          bin: i,
        };
      }),
      bin: index,
    };
  });

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
    range: args.colorScale,
    domain: [colorMin, colorMax],
  });
  const opacityScale = scaleLinear<number>({
    range: [0.4, 1],
    domain: [0, colorMax],
  });
  return {
    xScale,
    yScale,
    colorScale,
    opacityScale,
    colorMax,
    colorMin,
    binData,
  };
}

export function HeatmapSized({
  width,
  height,
  events = false,
  data,
  margin = defaultMargin,
  separation = 20,
}: HeatmapProps) {
  const {
    colorScale: commitColorScale,
    binData: commitBinData,
    opacityScale: commitOpacityScale,
    xScale,
    yScale,
  } = getStuff({
    data,
    getProperty: (d) => d.commits,
    colorScale: [darkGreenGitHubCommits, lightGreenGitHubCommits],
  });

  const { colorScale: tweetColorScale, opacityScale: tweetOpacityScale } =
    getStuff({
      data,
      getProperty: (d) => d.tweets,
      colorScale: [darkBlueTweets, lightBlueTweets],
    });

  // bounds
  const size =
    width > margin.left + margin.right
      ? width - margin.left - margin.right - separation
      : width;
  const xMax = size;
  const yMax = height - margin.bottom - margin.top;
  const binWidth = xMax / commitBinData.length;

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
          data={commitBinData}
          binWidth={binWidth}
          binHeight={binWidth}
          gap={4}
        >
          {(heatmap) =>
            heatmap.map((heatmapBins) =>
              heatmapBins.map((bin) => {
                const { commits, tweets, day } = data
                  .at(bin.column)
                  ?.at(bin.row) ?? {
                  commits: 0,
                  tweets: 0,
                };

                if (commits <= 0 && tweets <= 0)
                  return (
                    <rect
                      key={`heatmap-rect-${bin.row}-${bin.column}`}
                      className="visx-heatmap-rect "
                      width={bin.width}
                      height={bin.height}
                      x={bin.x}
                      y={bin.y}
                      opacity={0.05}
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
                            day,
                          }),
                        );
                      }}
                    />
                  );
                if (tweets > 0 && commits <= 0) {
                  return (
                    <rect
                      key={`heatmap-rect-${bin.row}-${bin.column}`}
                      className="visx-heatmap-rect "
                      width={bin.width}
                      height={bin.height}
                      x={bin.x}
                      y={bin.y}
                      opacity={tweetOpacityScale(tweets)}
                      fill={tweetColorScale(tweets)}
                      onClick={() => {
                        if (!events) return;
                        const { row, column } = bin;
                        alert(
                          JSON.stringify({
                            row,
                            column,
                            bin: bin.bin,
                            day,
                            commits,
                            tweets,
                          }),
                        );
                      }}
                    />
                  );
                }
                if (commits > 0 && tweets <= 0) {
                  return (
                    <rect
                      key={`heatmap-rect-${bin.row}-${bin.column}`}
                      className="visx-heatmap-rect "
                      width={bin.width}
                      height={bin.height}
                      x={bin.x}
                      y={bin.y}
                      opacity={commitOpacityScale(commits)}
                      fill={commitColorScale(commits)}
                      onClick={() => {
                        if (!events) return;
                        const { row, column } = bin;
                        alert(
                          JSON.stringify({
                            row,
                            day,

                            column,
                            bin: bin.bin,
                            commits,
                            tweets,
                          }),
                        );
                      }}
                    />
                  );
                }
                // both commits and tweets, do a square with the ratio of commits to tweets
                return (
                  <>
                    <rect
                      key={`heatmap-rect-${bin.row}-${bin.column}`}
                      className="visx-heatmap-rect "
                      width={bin.width}
                      height={bin.height}
                      x={bin.x}
                      y={bin.y}
                      opacity={0.5}
                      fill={commitColorScale(commits)}
                      onClick={() => {
                        if (!events) return;
                        const { row, column } = bin;
                        alert(
                          JSON.stringify({
                            row,
                            column,
                            bin: bin.bin,
                            day,

                            commits,
                            tweets,
                          }),
                        );
                      }}
                    />
                    <rect
                      key={`heatmap-rect-${bin.row}-${bin.column}`}
                      className="visx-heatmap-rect "
                      width={bin.width}
                      height={bin.height}
                      x={bin.x}
                      y={bin.y}
                      opacity={0.5}
                      fill={tweetColorScale(tweets)}
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
                            day,
                          }),
                        );
                      }}
                    />
                  </>
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
import type { TweetCommitData } from "../../server/api/routers/get-data";
export function Heatmap(props: Pick<HeatmapProps, "data">) {
  return (
    <ParentSize>
      {({ width, height }) => (
        <HeatmapSized width={width} height={height} events data={props.data} />
      )}
    </ParentSize>
  );
}
