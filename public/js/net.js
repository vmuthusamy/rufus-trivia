// Talks to a game on the server over a WebSocket, and reconnects by itself
// if the Wi-Fi blips or the iPad goes to sleep.
//
// Rule: there is only ever ONE live connection. Events from an old, replaced
// connection are ignored (otherwise a stale "you were replaced" could kick you out).

export function openGame(path, { hello, onMessage, onStatus }) {
  const url = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + path;
  let ws = null, closed = false, tries = 0, keepAlive = null, retryTimer = null, everOpened = false;

  function connect() {
    clearTimeout(retryTimer);
    retryTimer = null;
    if (closed || (ws && ws.readyState <= 1)) return; // already connecting or connected
    const sock = new WebSocket(url);
    ws = sock;
    sock.onopen = () => {
      if (sock !== ws) return;
      tries = 0;
      everOpened = true;
      onStatus("open");
      sock.send(JSON.stringify(hello()));
      clearInterval(keepAlive);
      keepAlive = setInterval(() => { if (sock.readyState === 1) sock.send('{"t":"ka"}'); }, 20000);
    };
    sock.onmessage = (e) => {
      if (sock !== ws) return;
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (msg.t !== "ka") onMessage(msg);
    };
    sock.onclose = (e) => {
      if (sock !== ws) return; // an old connection saying goodbye: not our problem any more
      clearInterval(keepAlive);
      if (closed) return;
      // 4000 = opened in another tab, 4001 = room closed, 4002 = not allowed in, 4003 = removed by host
      if (e.code >= 4000 && e.code < 4100) { closed = true; onStatus("ended", e.code); return; }
      tries++;
      onStatus("reconnecting", { tries, everOpened });
      if (!closed) retryTimer = setTimeout(connect, Math.min(5000, 300 * 2 ** tries));
    };
  }

  // Coming back to the tab? Reconnect right away instead of waiting for the timer.
  const wake = () => {
    if (closed || document.visibilityState !== "visible") return;
    if (ws && ws.readyState <= 1) return; // still fine
    tries = 0;
    connect();
  };
  document.addEventListener("visibilitychange", wake);

  connect();
  return {
    send(obj) {
      if (ws && ws.readyState === 1) { ws.send(JSON.stringify(obj)); return true; }
      return false;
    },
    close() {
      closed = true;
      clearInterval(keepAlive);
      clearTimeout(retryTimer);
      document.removeEventListener("visibilitychange", wake);
      try { ws.close(1000); } catch {}
    },
  };
}
