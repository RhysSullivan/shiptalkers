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
    });
  }
  return ee;
}

export const postRouter = createTRPCRouter({
  data: publicProcedure.input(z.object({ github: z.string(), twitter: z.string() })).subscription(({ input }) => {
    return observable<PageData>((emit) => {
      const key = `${input.github}-${input.twitter}`;
      console.log(`Subscribing to ${key}`)
      const listenToTweets = (input: {
        key: string;
        data: User;
        finished: boolean;
      }) => {
        if (input.key !== key) {
          return;
        }
        emit.next({
          isDataLoading: !input.finished,
          user: input.data,
        });
      };
      const ee = handleSubscribe({ ...input, emit, key });
      ee.on('tweetsGathered', listenToTweets);
      return () => {
        ee.off('tweetsGathered', listenToTweets);
      }
    })
  }),
});