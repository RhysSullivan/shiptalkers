import next from 'next';
import { createServer } from 'node:http';
import { parse } from 'node:url';
import type { Socket } from 'net';

import { WebSocketServer } from 'ws';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { appRouter } from './api/root';


const port = parseInt(process.env.PORT ?? '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

void app.prepare().then(() => {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    const server = createServer(async (req, res) => {
        if (!req.url) return;
        const parsedUrl = parse(req.url, true);
        try {
            await handle(req, res, parsedUrl);
            console.log(req.method, req.url, res.statusCode)
        } catch (err) {
            console.log(req.method, req.url, "ERROR")
            throw err;
        }
    });
    const wss = new WebSocketServer({ server });
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
    server.on('upgrade', (req, socket, head) => {
        wss.handleUpgrade(req, socket as Socket, head, (ws) => {
            wss.emit('connection', ws, req);
        });
    });

    // Keep the next.js upgrade handler from being added to our custom server
    // so sockets stay open even when not HMR.
    const originalOn = server.on.bind(server);
    server.on = function (event, listener) {
        return event !== 'upgrade' ? originalOn(event, listener) : server;
    };
    server.listen(port);

    console.log(
        `> Server listening at http://localhost:${port} as ${dev ? 'development' : process.env.NODE_ENV
        }`,
    );
});