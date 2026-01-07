import { getOffsetMs } from '../sync/clock-sync';
export class SessionClient {
    constructor(adapter, wsUrl, log) {
        this.adapter = adapter;
        this.wsUrl = wsUrl;
        this.log = log;
        this.channel = null;
    }
    connect() {
        this.channel = new WebSocket(this.wsUrl);
        this.channel.onopen = () => this.log('SessionClient: Connected');
        this.channel.onmessage = (ev) => this.handleMessage(ev);
        this.channel.onerror = (e) => this.log(`SessionClient error: ${e}`);
    }
    async handleMessage(ev) {
        try {
            const msg = JSON.parse(ev.data);
            if (msg.type === 'command') {
                await this.handleCommand(msg.command);
            }
        }
        catch (e) {
            // ignore non-json
        }
    }
    async handleCommand(cmd) {
        this.log(`Received command: ${cmd.type}`);
        switch (cmd.type) {
            case 'play':
                const playCmd = cmd;
                const offset = getOffsetMs() ?? 0;
                const targetTime = playCmd.payload.startTime - offset;
                const delay = Math.max(0, targetTime - Date.now());
                setTimeout(() => {
                    this.adapter.play(playCmd.payload.trackUri, playCmd.payload.seekMs);
                }, delay);
                break;
            case 'pause':
                await this.adapter.pause();
                break;
            case 'seek':
                // TODO: Implement seek
                break;
        }
    }
    sendCommand(cmd) {
        if (this.channel && this.channel.readyState === WebSocket.OPEN) {
            this.channel.send(JSON.stringify({ type: 'command', command: cmd }));
        }
    }
}
