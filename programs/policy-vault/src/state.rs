use anchor_lang::prelude::*;

pub const POLICY_VAULT_SEED: &[u8] = b"policy_vault";
pub const VAULT_FUNDS_SEED: &[u8] = b"vault_funds";

/// PRD §4.1 — LOCKED layout. Changing it requires redeploy + vault re-init.
/// Seeds: [b"policy_vault", owner].
#[account]
#[derive(InitSpace)]
pub struct PolicyVault {
    pub owner: Pubkey,
    pub agent_delegate: Pubkey,
    pub max_per_tx: u64,
    pub daily_cap: u64,
    pub daily_spent: u64,
    pub window_start_ts: i64,
    pub cooldown_secs: i64,
    pub last_tx_ts: i64,
    pub is_frozen: bool,
    #[max_len(5)]
    pub allowlist: Vec<Pubkey>,
    pub last_evidence_hash: [u8; 32],
    pub tx_count: u64,
    pub bump: u8,
    pub funds_bump: u8,
}
