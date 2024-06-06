/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
class AbortError extends Error {
    constructor() {
        super('Throttled function aborted');
        this.name = 'AbortError';
    }
}

interface ThrottleOptions {
    limit: number;
    interval: number;
    strict?: boolean;
    onDelay?: () => void;
}

type ThrottledFunction = (...args: any[]) => Promise<any>;

export function pThrottle({ limit, interval, strict = false, onDelay }: ThrottleOptions) {
    if (!Number.isFinite(limit)) {
        throw new TypeError('Expected `limit` to be a finite number');
    }

    if (!Number.isFinite(interval)) {
        throw new TypeError('Expected `interval` to be a finite number');
    }

    const queue = new Map<number, (reason?: any) => void>();

    let currentTick = 0;
    let activeCount = 0;

    function windowedDelay() {
        const now = Date.now();

        if ((now - currentTick) > interval) {
            activeCount = 1;
            currentTick = now;
            return 0;
        }

        if (activeCount < limit) {
            activeCount++;
        } else {
            currentTick += interval;
            activeCount = 1;
        }

        return currentTick - now;
    }

    const strictTicks: number[] = [];

    function strictDelay() {
        const now = Date.now();

        if (strictTicks.length > 0 && now - strictTicks[strictTicks.length - 1]! > interval) {
            strictTicks.length = 0;
        }

        if (strictTicks.length < limit) {
            strictTicks.push(now);
            return 0;
        }

        const nextExecutionTime = strictTicks[0]! + interval;

        strictTicks.shift();
        strictTicks.push(nextExecutionTime);

        return Math.max(0, nextExecutionTime - now);
    }

    const getDelay = strict ? strictDelay : windowedDelay;

    return function (func: (...args: any[]) => any): ThrottledFunction {
        const throttled: ThrottledFunction = (...args: any[]) => {
            // @ts-expect-error - no idea
            if (!throttled.isEnabled) {
                // @ts-expect-error - no idea
                return (async () => func.apply(this, args))();
            }

            let timeoutId: any;
            return new Promise((resolve, reject) => {
                const execute = () => {
                    // @ts-expect-error - no idea
                    resolve(func.apply(this, args));
                    queue.delete(timeoutId);
                };

                const delay = getDelay();
                if (delay > 0) {
                    timeoutId = setTimeout(execute, delay);
                    queue.set(timeoutId, reject);
                    onDelay?.();
                } else {
                    execute();
                }
            });
        };

        // @ts-expect-error - no idea
        throttled.abort = () => {
            for (const timeout of queue.keys()) {
                clearTimeout(timeout);
                queue.get(timeout)?.(new AbortError());
            }

            queue.clear();
            strictTicks.splice(0, strictTicks.length);
        };

        // @ts-expect-error - no idea
        throttled.isEnabled = true;

        Object.defineProperty(throttled, 'queueSize', {
            get() {
                return queue.size;
            },
        });

        return throttled;
    };
}
