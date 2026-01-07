// Minimal typings for Spotify Web Playback SDK used in this project
// Reference: https://developer.spotify.com/documentation/web-playback-sdk

declare namespace Spotify {
  interface PlayerOptions {
    name: string;
    getOAuthToken: (cb: (token: string) => void) => void;
    volume?: number;
  }

  interface Player {
    addListener(event: string, cb: (data: any) => void): void;
    connect(): Promise<boolean> | boolean;
    getCurrentState(): Promise<{ position: number } | null>;
  }
}

interface Window {
  Spotify: { Player: new (opts: Spotify.PlayerOptions) => Spotify.Player } | undefined;
  onSpotifyWebPlaybackSDKReady: () => void;
}
