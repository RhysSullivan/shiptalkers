import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { WebSocketServer } from 'ws';
import { appRouter } from './api/root';

const wss = new WebSocketServer({
    port: 3001,
});
const handler = applyWSSHandler({
    // @ts-expect-error asd
    wss, router: appRouter, createContext: () => (
        {}
    )
});

wss.on('connection', (ws) => {
    console.log(`➕➕ Connection (${wss.clients.size})`);
    ws.once('close', () => {
        console.log(`➖➖ Connection (${wss.clients.size})`);
    });
});
console.log('✅ WebSocket Server listening on ws://localhost:3001');

process.on('SIGTERM', () => {
    console.log('SIGTERM');
    handler.broadcastReconnectNotification();
    wss.close();
});