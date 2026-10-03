// Talks to a game on the server over a WebSocket, and reconnects by itself
// if the Wi-Fi blips or the iPad goes to sleep.

export function openGame(path, { hello, onMessage, onStatus }) {
  const url = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + path;
  let ws = null, closed = false, tries = 0, keepAlive = null;

  function connect() {
    ws = new WebSocket(url);
    ws.onopen = () => {
      tries = 0;
      onStatus("open");
      ws.send(JSON.stringify(hello()));
      clearInterval(keepAlive);
      keepAlive = setInterval(() => { if (ws.readyState === 1) ws.send('{"t":"ka"}'); }, 20000);
    };
    ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (msg.t !== "ka") onMessage(msg);
    };
    ws.onclose = (e) => {
      clearInterval(keepAlive);
      if (closed) return;
      // 4000 = opened in another tab, 4001 = room closed, 4002 = not allowed in
      if (e.code >= 4000 && e.code < 4100) { closed = true; onStatus("ended", e.code); return; }
      onStatus("reconnecting");
      setTimeout(() => { if (!closed) connect(); }, Math.min(5000, 300 * 2 ** tries++));
    };
  }

  // Coming back to the tab? Reconnect right away instead of waiting.
  const wake = () => { if (!closed && document.visibilityState === "visible" && ws && ws.readyState > 1) { tries = 0; connect(); } };
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
      document.removeEventListener("visibilitychange", wake);
      try { ws.close(1000); } catch {}
    },
  };
}
