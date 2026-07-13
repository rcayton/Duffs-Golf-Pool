// ─── Payment links ─────────────────────────────────────────────────────────────
// Optional Venmo / Cash App links per pool player, keyed by PoolPlayer.id.
// When a player wins a major, the archived-major Payouts card shows their
// links as "pay" buttons. Add entries as people share their handles.
//
//   venmo:   https://venmo.com/u/<username>          (or account.venmo.com link)
//   cashapp: https://cash.app/$<cashtag>

export interface PaymentLinks {
  venmo?: string;
  cashapp?: string;
}

export const PAYMENT_LINKS: Record<string, PaymentLinks> = {
  buer: {
    venmo: "https://venmo.com/u/lukebuer",     // @lukebuer
    cashapp: "https://cash.app/$LukeBuer",     // $LukeBuer
  },
};
