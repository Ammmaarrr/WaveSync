export type CommandType = 'play' | 'pause' | 'seek';

export interface Command {
    type: CommandType;
    timestamp: number; // Server time when command was issued
    payload?: any;
}

export interface PlayCommand extends Command {
    type: 'play';
    payload: {
        trackUri: string;
        startTime: number; // Scheduled server time to start
        seekMs: number;
    };
}

export interface PauseCommand extends Command {
    type: 'pause';
}

export interface SeekCommand extends Command {
    type: 'seek';
    payload: {
        positionMs: number;
    };
}

export type SyncMessage = Command | { type: 'telemetry'; drift: number; timestamp: number };
