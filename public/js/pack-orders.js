// Remember an uncertain purchase across retries and reloads. No reward data lives here.
export function pendingOrders(storage) {
  const memory = new Map();
  const key = (pid) => "rt_pending_pack_" + pid;
  return {
    get(pid, packIds) {
      let p = memory.get(pid);
      if (!p) { try { p = JSON.parse(storage()?.getItem(key(pid))); } catch {} }
      if (p && typeof p.nonce === "string" && /^[a-zA-Z0-9_-]{8,64}$/.test(p.nonce) && packIds.includes(p.pack)) return p;
      return null;
    },
    set(pid, order) {
      if (order) memory.set(pid, order); else memory.delete(pid);
      try {
        if (order) storage()?.setItem(key(pid), JSON.stringify(order));
        else storage()?.removeItem(key(pid));
      } catch {} // With storage blocked, retries in this tab still reuse the nonce.
    },
  };
}
