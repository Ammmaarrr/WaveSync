import { PlaybackAdapter } from '@shared/playback-adapter';
import { Command, PlayCommand } from '@shared/types';
import { getOffsetMs } from '../sync/clock-sync';

export class SessionClient {
    private channel: WebSocket | null = null;

    constructor(
        private adapter: PlaybackAdapter,
        private wsUrl: string,
        private log: (msg: string) => void
    ) { }

    connect() {
        this.channel = new WebSocket(this.wsUrl);
        this.channel.onopen = () => this.log('SessionClient: Connected');
        this.channel.onmessage = (ev) => this.handleMessage(ev);
        this.channel.onerror = (e) => this.log(`SessionClient error: ${e}`);
    }

    private async handleMessage(ev: MessageEvent) {
        try {
            const msg = JSON.parse(ev.data);
            if (msg.type === 'command') {
                await this.handleCommand(msg.command as Command);
            }
        } catch (e) {
            // ignore non-json
        }
    }

    private async handleCommand(cmd: Command) {
        this.log(`Received command: ${cmd.type}`);
        switch (cmd.type) {
            case 'play':
                const playCmd = cmd as PlayCommand;
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

    sendCommand(cmd: Command) {
        if (this.channel && this.channel.readyState === WebSocket.OPEN) {
            this.channel.send(JSON.stringify({ type: 'command', command: cmd }));
        }
    }
}
