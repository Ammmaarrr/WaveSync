export let accessToken = null;
export let refreshToken = null;
export let tokenExpiresAt = null;
export function setAccessToken(token) {
    accessToken = token;
}
export function getAccessToken() {
    return accessToken;
}
export function getRefreshToken() {
    return refreshToken;
}
export function getTokenExpiresAt() {
    return tokenExpiresAt;
}
export async function pkceSignIn(httpBase, clientId) {
    const redirectUri = `${window.location.origin}/callback`;
    const scopes = ['streaming', 'user-read-playback-state', 'user-modify-playback-state'];
    // Generate PKCE params
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const state = generateRandomString(32);
    sessionStorage.setItem('pkce_verifier', verifier);
    sessionStorage.setItem('pkce_state', state);
    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('code_challenge', challenge);
    authUrl.searchParams.set('state', state);
    window.location.href = authUrl.toString();
}
export async function handleCallback(httpBase, log) {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const storedState = sessionStorage.getItem('pkce_state');
    const verifier = sessionStorage.getItem('pkce_verifier');
    if (!code || !state || state !== storedState || !verifier) {
        log('Auth callback error: missing or invalid params');
        return;
    }
    sessionStorage.removeItem('pkce_state');
    sessionStorage.removeItem('pkce_verifier');
    const redirectUri = `${window.location.origin}/callback`;
    try {
        const resp = await fetch(`${httpBase}/spotify/exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, codeVerifier: verifier, redirectUri })
        });
        if (!resp.ok) {
            const text = await resp.text();
            log(`Token exchange failed: ${resp.status} ${text}`);
            return;
        }
        const data = await resp.json();
        accessToken = data.access_token;
        refreshToken = data.refresh_token;
        const expiresIn = data.expires_in || 3600;
        tokenExpiresAt = Date.now() + (expiresIn - 30) * 1000;
        log('PKCE sign-in successful! Token acquired.');
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    catch (e) {
        log(`Token exchange error: ${e}`);
    }
}
export async function refreshTokensFromServer(httpBase, log) {
    if (!refreshToken) {
        log('No refresh token available');
        return false;
    }
    try {
        const resp = await fetch(`${httpBase}/spotify/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });
        if (!resp.ok) {
            const text = await resp.text();
            log(`Token refresh failed: ${resp.status} ${text}`);
            return false;
        }
        const data = await resp.json();
        accessToken = data.access_token;
        const expiresIn = data.expires_in || 3600;
        tokenExpiresAt = Date.now() + (expiresIn - 30) * 1000;
        log('Token refreshed successfully');
        return true;
    }
    catch (e) {
        log(`Token refresh error: ${e}`);
        return false;
    }
}
function generateCodeVerifier() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~';
    let result = '';
    for (let i = 0; i < 128; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}
async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}
function generateRandomString(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}
