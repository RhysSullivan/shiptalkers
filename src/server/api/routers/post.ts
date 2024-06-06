import { z } from "zod";
import { Observer, observable } from '@trpc/server/observable';
import { EventEmitter } from 'events';
import { PageData, getUserDataStreamed } from "./get-data";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { User } from "../../db/schema";


const activeQueries = new Map<string, EventEmitter>();

function handleSubscribe(input: {
  github: string;
  twitter: string;
  emit: Observer<PageData, unknown>
  key: string;
}
) {
  const { key } = input;
  let ee = activeQueries.get(key);
  if (!ee) {
    ee = new EventEmitter().setMaxListeners(0);
    activeQueries.set(key, ee);
    void getUserDataStreamed({
      githubName: input.github, twitterName: input.twitter, emit:
        (chunk) => {
          ee!.emit('tweetsGathered', {
            key,
            data: chunk,
            finished: false,
          });
        },
      onComplete: (data) => {
        activeQueries.delete(key);
        ee!.emit('tweetsGathered', {
          key,
          data,
          finished: true,
        });
      }
    }).catch((err) => {
      console.error(err);
      activeQueries.delete(key);
      ee!.emit('tweetsGathered', { key: key, error: "We encountered an error fetching this profile, please make sure the profile exists and try again. If this continues open an issue on GitHub", finished: true });
    });;
  }
  return ee;
}

type ErrorOrUser = {
  error: string;
} | {
  data: User;
}

type EmitData = {
  key: string;
  finished: boolean;
} & ErrorOrUser

export const postRouter = createTRPCRouter({
  data: publicProcedure.input(z.object({ github: z.string(), twitter: z.string() })).subscription(({ input }) => {
    return observable<PageData | string>((emit) => {
      const key = `${input.github}-${input.twitter}`;
      console.log(`Subscribing to ${key}`)
      const listenToTweets = (input: EmitData) => {
        if (input.key !== key) {
          return;
        }
        if ('error' in input && input.error) {
          emit.next(input.error.includes('429') ? `We're hitting rate limits at the moment, just hang tight and keep the page open. Thanks for your patience!`
            : input.error);
          return;
        }
        if ('data' in input && input.data) {
          emit.next({
            isDataLoading: !input.finished,
            user: input.data,
          });
        }
      };
      const ee = handleSubscribe({ ...input, emit, key });
      ee.on('tweetsGathered', listenToTweets);
      return () => {
        ee.off('tweetsGathered', listenToTweets);
      }
    })
  }),
});