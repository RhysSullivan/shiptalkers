import { Github, HeartIcon, Twitter } from "lucide-react";
import { FindAMatch } from "./input";
import { Tweet } from "react-tweet";

export function Home() {
  return (
    <main className="mx-auto flex w-full max-w-screen-2xl flex-grow flex-col items-center justify-center overflow-x-hidden py-6 xl:pt-[calc(30vh-3.25rem)]">
      {/* bg-[linear-gradient(90deg,#8884_1px,transparent_0),linear-gradient(180deg,#8884_1px,transparent_0)] */}
      <div className="absolute left-1/2 top-1/2 -z-10 hidden h-32 w-96 -translate-x-[calc(50%+16rem)] -translate-y-full -rotate-45 rounded-full bg-pink-500/20 blur-[128px] md:block" />
      <div className="absolute left-1/2 top-1/2 -z-10 hidden h-32 w-96 -translate-x-1/2 -translate-y-full -rotate-45 rounded-full bg-purple-500/20 blur-[128px] md:block" />
      <div className="absolute left-1/2 top-1/2 -z-10 hidden h-32 w-96 -translate-x-[calc(50%-16rem)] -translate-y-full -rotate-45 rounded-full bg-blue-500/20 blur-[128px] md:block" />
      <div className="absolute left-0 top-0 -z-20 hidden h-full w-full bg-[radial-gradient(black_1px,_transparent_0)] bg-[length:40px_40px] [mask-image:linear-gradient(165deg,red,transparent_69%)] md:block" />
      <div className="flex w-full max-w-2xl items-center justify-center gap-4 py-4">
        <Github size={64} />
        <HeartIcon size={32} />
        <Twitter size={64} />
      </div>
      <span className="max-w-[600px] text-balance pb-4 text-center opacity-70">
        Matching yappers to shippers
      </span>
      <FindAMatch />
      <div className="flex flex-col justify-center gap-4 px-2 md:flex-row md:gap-16"></div>
      <div className="flex  flex-col items-center ">
        <span className="text-center text-lg font-semibold">
          Support the launch!
        </span>
        <Tweet id={"1800585506096558567"} />
      </div>
    </main>
  );
}
