// 🕳️ BURROW - one player's coins and cards, in a Durable Object of their own.
// The rules are in shared/burrow-core.js (so they can be tested). Nothing in here decides anything.
//
// Who can call it:
//   - GameRoom pays for finished games (settle). A browser can't reach that.
//   - The Worker handles a player's own requests, proven by their private player id.

import { DurableObject } from "cloudflare:workers";
import { BurrowCore } from "./shared/burrow-core.js";

export class Burrow extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.core = new BurrowCore(ctx.storage.sql, (fn) => ctx.storage.transactionSync(fn));
  }

  state() { return this.core.state(); }
  featured() { return this.core.featured(); }
  settle(payment) { return this.core.settle(payment); }
  buy(order) { return this.core.buy(order); }
  opened(pack) { return this.core.opened(pack); }
  feature(choice) { return this.core.feature(choice); }
}
