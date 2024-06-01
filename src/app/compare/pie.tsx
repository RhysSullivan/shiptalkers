"use client";
import { DonutChart, Legend } from "@tremor/react";

const valueFormatter = (number: number) =>
  new Intl.NumberFormat("en-US").format(number);

export function RatioPie(props: { tweets: number; commits: number }) {
  const data = [
    { name: "Tweets", value: props.tweets },
    { name: "Commits", value: props.commits },
  ];

  return (
    <>
      <div className="flex  items-center justify-center space-x-6">
        <DonutChart
          data={data}
          category="value"
          index="name"
          valueFormatter={valueFormatter}
          colors={["#1DA1F2", "#26a641"]}
          className="w-40"
          showLabel={false}
          variant="pie"
        />
        <Legend
          categories={["Tweets", "Commits"]}
          colors={["#1DA1F2", "#26a641"]}
          className="max-w-xs"
        />
      </div>
    </>
  );
}
