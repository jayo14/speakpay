// Every spoken verdict lives here (PRD §5.2: one file, <= 30 words each).

const sol = (lamports: number) => `${Number((lamports / 1e9).toFixed(4))} SOL`;

export const copy = {
  passed: (vendor: string, plan: string, lamports: number) =>
    `Verified. ${vendor}, ${plan}, ${sol(lamports)}. Paid inside your limits. The receipt is on-chain.`,
  injection: () =>
    "Blocked. That page contains hidden instructions trying to hijack your payment. Nothing was sent.",
  onchainRejected: (errorName: string) => {
    const why: Record<string, string> = {
      VaultFrozen: "your vault is frozen",
      ExceedsMaxPerTx: "it exceeds your per-payment limit",
      ExceedsDailyCap: "it exceeds your daily cap",
      CooldownActive: "your cooldown hasn't finished",
      RecipientNotAllowlisted: "that wallet isn't on your allowlist",
      UnauthorizedAgent: "the agent key isn't authorized for this vault",
      InsufficientVaultBalance: "your vault balance is too low",
    };
    return `Rejected by Solana: ${why[errorName] ?? errorName}. No money moved.`;
  },
  priceTooHigh: (price: number, max: number) =>
    `Not paid. The live price is ${price} SOL, above your limit of ${max} SOL.`,
  missingField: () => "I couldn't verify the price and wallet on that page, so I didn't pay.",
  badWallet: () => "The page lists an invalid Solana wallet, so I didn't pay.",
  frozenOffchain: () => "Your vault is frozen, so I didn't try to pay. Unfreeze it on the Vault tab first.",
  unknownIntent: () => "I didn't understand that. Try: check the Dev3pack page and pay if it's under 0.05 SOL.",
  emptyTranscript: () => "I didn't catch that. Hold the button and speak again.",
  freezeRequested: () => "Freezing your vault. Approve the request in your wallet.",
  frozen: () => "Vault frozen. Your agent can no longer spend.",
  scrapeError: () => "I couldn't verify that page right now, so nothing was sent.",
  chainError: () => "I couldn't reach Solana right now, so nothing was sent.",
  sttError: () => "I couldn't transcribe that right now. Please try again.",
};
