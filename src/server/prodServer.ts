import type { Socket } from 'net';

import { WebSocketServer } from 'ws';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { appRouter } from './api/root';


const port = parseInt(process.env.PORT ?? '3001', 10);
const dev = process.env.NODE_ENV !== 'production';


const wss = new WebSocketServer({
    port: port
});
const handler = applyWSSHandler({
    // @ts-expect-error asd
    wss, router: appRouter, createContext: () => (
        {}
    )
});

process.on('SIGTERM', () => {
    console.log('SIGTERM');
    handler.broadcastReconnectNotification();
});
wss.on('connection', (ws) => {
    console.log(`➕➕ Connection (${wss.clients.size})`);
    ws.once('close', () => {
        console.log(`➖➖ Connection (${wss.clients.size})`);
    });
});
console.log(
    `> Server listening at http://localhost:${port} as ${dev ? 'development' : process.env.NODE_ENV
    }`,
);
