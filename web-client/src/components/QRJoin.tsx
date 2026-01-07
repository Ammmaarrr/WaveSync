import React, { useState } from 'react';
import QRCode from 'react-qr-code';

type QRJoinProps = {
  httpBase: string;
  onJoin?: (sessionId: string) => void;
};

export function QRJoinComponent({ httpBase, onJoin }: QRJoinProps) {
  const [sessionId, setSessionId] = useState('');
  const [generating, setGenerating] = useState(false);

  const createSession = async () => {
    setGenerating(true);
    try {
      const resp = await fetch(`${httpBase}/session/create`, { method: 'POST' });
      const data = await resp.json();
      setSessionId(data.sessionId);
      if (onJoin) onJoin(data.sessionId);
    } catch (e) {
      console.error('Failed to create session', e);
    } finally {
      setGenerating(false);
    }
  };

  const joinUrl = sessionId
    ? `${window.location.origin}/?sessionId=${sessionId}&autoJoin=true`
    : '';

  return (
    <div className="qr-join">
      <h3>🎵 Join Session</h3>
      
      {!sessionId && (
        <button onClick={createSession} disabled={generating}>
          {generating ? 'Creating...' : 'Create New Session'}
        </button>
      )}

      {sessionId && (
        <>
          <div className="qr-code-container">
            <QRCode value={joinUrl} size={200} />
          </div>
          <div className="session-info">
            <p><strong>Session ID:</strong> {sessionId}</p>
            <p><strong>Join URL:</strong></p>
            <input
              type="text"
              value={joinUrl}
              readOnly
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(joinUrl);
                alert('Copied to clipboard!');
              }}
            >
              Copy URL
            </button>
          </div>
        </>
      )}
    </div>
  );
}
