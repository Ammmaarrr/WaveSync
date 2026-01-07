import { getAccessToken } from '../auth/spotify-auth';
import { getDeviceId, getPlayer } from '../player/web-player';
export class WebAdapter {
    constructor(httpBase, log) {
        this.httpBase = httpBase;
        this.log = log;
    }
    async play(trackUri, seekMs) {
        const deviceId = getDeviceId();
        const token = getAccessToken();
        if (!deviceId || !token) {
            this.log('WebAdapter: No deviceId or token');
            return;
        }
        try {
            const body = { uris: [trackUri] };
            if (seekMs > 0)
                body.position_ms = seekMs;
            await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
        }
        catch (e) {
            this.log(`WebAdapter play error: ${e}`);
        }
    }
    async pause() {
        const deviceId = getDeviceId();
        const token = getAccessToken();
        if (!deviceId || !token)
            return;
        try {
            await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${encodeURIComponent(deviceId)}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
        }
        catch (e) {
            this.log(`WebAdapter pause error: ${e}`);
        }
    }
    async seek(positionMs) {
        const deviceId = getDeviceId();
        const token = getAccessToken();
        if (!deviceId || !token)
            return;
        try {
            await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}&device_id=${encodeURIComponent(deviceId)}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
        }
        catch (e) {
            this.log(`WebAdapter seek error: ${e}`);
        }
    }
    async getState() {
        const player = getPlayer();
        if (!player)
            return null;
        const state = await player.getCurrentState();
        if (!state)
            return null;
        return {
            paused: state.paused,
            position: state.position,
            duration: state.duration,
            trackUri: state.track_window?.current_track?.uri ?? null,
            lastUpdated: Date.now()
        };
    }
}
