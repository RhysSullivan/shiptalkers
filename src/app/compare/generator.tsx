import { Suspense } from "react";

export function generatorComponent<T>(
  fn: (props: T) => AsyncGenerator<JSX.Element, JSX.Element, JSX.Element>,
): React.FC<T> {
  return (props: T) => {
    return <GeneratorComponent generator={fn(props)} />;
  };
}
const GeneratorComponent = async (props: {
  generator: AsyncGenerator<JSX.Element, JSX.Element, JSX.Element>;
}) => {
  const { generator } = props;
  const result = await generator.next();
  if (result.done) {
    return result.value;
  }

  return (
    <Suspense fallback={result.value}>
      <GeneratorComponent generator={generator} />
    </Suspense>
  );
};
