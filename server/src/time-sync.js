export function handleClockSync(socket, msg, serverRecv) {
    // Clock sync response with NTP-like fields
    // t1: client send time (from client)
    // serverRecv: server receive time (t2)
    // serverTime: server send time (t3)
    const t1 = Number(msg.t1) || 0;
    const t3 = Date.now();
    const reply = { type: 'pong', t1, serverRecv, serverTime: t3 };
    socket.send(JSON.stringify(reply));
}
