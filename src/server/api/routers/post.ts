import { z } from "zod";
import { Observer, observable } from '@trpc/server/observable';
import { EventEmitter } from 'events';
import { PageData, TweetCommitData, getUserDataStreamed } from "./get-data";
import { createTRPCRouter, publicProcedure } from "../trpc";

const ee = new EventEmitter();

const activeQueries = new Set<string>();

async function handleSubscribe(input: {
  github: string;
  twitter: string;
  emit: Observer<PageData, unknown>
  key: string;
}
) {
  const { key } = input;
  if (!activeQueries.has(key)) {
    activeQueries.add(key);
    void getUserDataStreamed({
      githubName: input.github, twitterName: input.twitter, emit:
        (chunk) => {
          ee.emit('tweetsGathered', {
            key,
            data: chunk,
            finished: false,
          });
        },
      onComplete: (data) => {
        activeQueries.delete(key);
        ee.emit('tweetsGathered', {
          key,
          data,
          finished: true,
        });
      }
    });
  }
}

export const postRouter = createTRPCRouter({
  data: publicProcedure.input(z.object({ github: z.string(), twitter: z.string() })).subscription(({ input }) => {
    return observable<PageData>((emit) => {
      const key = `${input.github}-${input.twitter}`;
      console.log(`Subscribing to ${key}`)
      const listenToTweets = (input: {
        key: string;
        data: TweetCommitData;
        finished: boolean;
      }) => {
        if (input.key !== key) {
          return;
        }
        emit.next({
          isDataLoading: !input.finished,
          data: input.data,
        });
      };
      void handleSubscribe({ ...input, emit, key });
      ee.on('tweetsGathered', listenToTweets);
      return () => {
        ee.off('tweetsGathered', listenToTweets);
      }
    })
  }),
});