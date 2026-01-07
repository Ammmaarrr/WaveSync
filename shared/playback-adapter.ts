export interface PlaybackState {
    paused: boolean;
    position: number; // ms
    duration: number; // ms
    trackUri: string | null;
    lastUpdated: number; // timestamp
}

export interface PlaybackAdapter {
    play(trackUri: string, seekMs: number): Promise<void>;
    pause(): Promise<void>;
    seek(positionMs: number): Promise<void>;
    getState(): Promise<PlaybackState | null>;
}
