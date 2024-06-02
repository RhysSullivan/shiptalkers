"use client";
import { DonutChart, Legend } from "@tremor/react";

const valueFormatter = (number: number) =>
  new Intl.NumberFormat("en-US").format(number);

export function RatioPie(props: { tweets: number; commits: number }) {
  const data = [
    { name: "tweets", value: props.tweets },
    { name: "commits", value: props.commits },
  ];

  return (
    <>
      <DonutChart
        data={data}
        category="value"
        index="name"
        valueFormatter={valueFormatter}
        colors={["#1DA1F2", "#26a641"]}
        className="w-32"
        showLabel={false}
        variant="pie"
      />
    </>
  );
}
