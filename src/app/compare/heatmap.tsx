"use client";
import React, { useState } from "react";
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

type TooltipProps = {
  left: number;
  top: number;
  day: string;
  commits: number;
  tweets: number;
};

function Tooltip({ left, top, day, commits, tweets }: TooltipProps) {
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        backgroundColor: "white",
        padding: "5px",
        borderRadius: "3px",
        pointerEvents: "none",
        boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
        fontSize: "12px",
      }}
    >
      <div>Date: {day}</div>
      <div>Commits: {commits}</div>
      <div>Tweets: {tweets}</div>
    </div>
  );
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

  const [tooltip, setTooltip] = useState<TooltipProps | null>(null);

  return (
    <>
      <svg
        width={width}
        height={height}
        className="overflow-scroll rounded-md border-2"
      >
        <Group
          top={margin.top - separation}
          left={margin.left + separation / 2}
        >
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

                  function getOpacity() {
                    if (commits <= 0 && tweets <= 0) return 0.05;
                    if (tweets > 0 && commits <= 0)
                      return tweetOpacityScale(tweets);
                    if (commits > 0 && tweets <= 0)
                      return commitOpacityScale(commits);
                    return 0.5;
                  }

                  function getFill() {
                    if (commits <= 0 && tweets <= 0) return "#000";
                    if (tweets > 0 && commits <= 0)
                      return tweetColorScale(tweets);
                    if (commits > 0 && tweets <= 0)
                      return commitColorScale(commits);
                    return commitColorScale(commits);
                  }

                  function Square() {
                    if (commits > 0 && tweets > 0) {
                      // both commits and tweets, do a square with the ratio of commits to tweets
                      return (
                        <>
                          <rect
                            className="visx-heatmap-rect "
                            width={bin.width}
                            height={bin.height}
                            x={bin.x}
                            y={bin.y}
                            opacity={0.5}
                            fill={commitColorScale(commits)}
                          />
                          <rect
                            className="visx-heatmap-rect "
                            width={bin.width}
                            height={bin.height}
                            x={bin.x}
                            y={bin.y}
                            opacity={0.5}
                            fill={tweetColorScale(tweets)}
                          />
                        </>
                      );
                    }
                    return (
                      <rect
                        className="visx-heatmap-rect "
                        width={bin.width}
                        height={bin.height}
                        x={bin.x}
                        y={bin.y}
                        opacity={getOpacity()}
                        fill={getFill()}
                      />
                    );
                  }

                  return (
                    <g
                      key={`heatmap-rect-${bin.row}-${bin.column}`}
                      onMouseEnter={(e) => {
                        setTooltip({
                          left: e.clientX + 10,
                          top: e.clientY - 10,
                          day: day ?? "",
                          commits,
                          tweets,
                        });
                      }}
                      onMouseLeave={() => {
                        setTooltip(null);
                      }}
                    >
                      <Square />
                    </g>
                  );
                }),
              )
            }
          </HeatmapRect>
        </Group>
      </svg>
      {tooltip && <Tooltip {...tooltip} />}
    </>
  );
}

import ParentSize from "@visx/responsive/lib/components/ParentSize";
import { TweetCommitData } from "../../server/db/schema";

export function Heatmap(props: Pick<HeatmapProps, "data">) {
  return (
    <div className="h-[170px] w-[1280px]">
      <ParentSize>
        {({ width, height }) => (
          <HeatmapSized width={1280} height={170} events data={props.data} />
        )}
      </ParentSize>
    </div>
  );
}
