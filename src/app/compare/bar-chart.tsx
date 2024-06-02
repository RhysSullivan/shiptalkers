"use client";
import { BarChart } from "@tremor/react";

const dataFormatter = (number: number) =>
  Intl.NumberFormat("us").format(number).toString();

export function RatioBarChart(props: {
  data: {
    day: string;
    tweets: number;
    commits: number;
  }[];
}) {
  return (
    <>
      <BarChart
        className="mt-6"
        data={props.data}
        index="day"
        showLegend={false}
        showXAxis={false}
        categories={["tweets", "commits"]}
        colors={["#1DA1F2", "#26a641"]}
        valueFormatter={dataFormatter}
        yAxisWidth={48}
      />
    </>
  );
}
