import { getAccessToken, getTokenExpiresAt, getRefreshToken, refreshTokensFromServer } from '../auth/spotify-auth';
import { getOffsetMs } from '../sync/clock-sync';
let deviceId = null;
let player = null;
export function getDeviceId() {
    return deviceId;
}
export function getPlayer() {
    return player;
}
export function initSpotify(httpBase, log) {
    const token = getAccessToken();
    window.onSpotifyWebPlaybackSDKReady = () => {
        const SpotifyNS = window.Spotify;
        if (!SpotifyNS) {
            log('Spotify SDK not available on window');
            return;
        }
        const p = new SpotifyNS.Player({
            name: 'WaveSync Web Player',
            getOAuthToken: async (cb) => {
                // Auto-refresh if needed
                const tokenExpiresAt = getTokenExpiresAt();
                const refreshToken = getRefreshToken();
                if (tokenExpiresAt && Date.now() >= tokenExpiresAt && refreshToken) {
                    await refreshTokensFromServer(httpBase, log);
                }
                cb(getAccessToken());
            },
            volume: 0.8
        });
        p.addListener('ready', ({ device_id }) => { deviceId = device_id; log(`Player ready: device_id=${deviceId}`); });
        p.addListener('not_ready', ({ device_id }) => log(`Player not ready: ${device_id}`));
        p.addListener('initialization_error', ({ message }) => log(`Init error: ${message}`));
        p.addListener('authentication_error', ({ message }) => log(`Auth error: ${message}`));
        p.addListener('account_error', ({ message }) => log(`Account error: ${message}`));
        p.connect();
        player = p;
    };
    if (window.Spotify)
        window.onSpotifyWebPlaybackSDKReady();
}
export async function transferPlayback(play = false, log) {
    if (!deviceId)
        return log('No deviceId');
    const token = getAccessToken();
    if (!token)
        return log('No access token');
    const resp = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_ids: [deviceId], play })
    });
    log(`Transfer playback => ${resp.status}`);
}
export function scheduleStart(startServerTime, trackUri, seekMs, bufferMs = 3000, log) {
    const off = getOffsetMs() ?? 0;
    const localTarget = startServerTime - off; // ms epoch
    const now = Date.now();
    const delay = Math.max(0, Math.round(localTarget - now));
    log(`Scheduling play in ${delay}ms (offset=${off.toFixed(2)}ms, buffer=${bufferMs}ms)`);
    // Recommend host to set start_time at least 3s in the future to accommodate Web API latency.
    setTimeout(async () => {
        try {
            const token = getAccessToken();
            if (!deviceId)
                return log('No deviceId; did you init + transfer?');
            if (!token)
                return log('No access token');
            // Start playback on the web player device
            const body = { uris: [trackUri] };
            if (seekMs > 0)
                body.position_ms = seekMs;
            const resp = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            log(`play() => ${resp.status}`);
        }
        catch (e) {
            log(`play error: ${e}`);
        }
    }, delay);
}
