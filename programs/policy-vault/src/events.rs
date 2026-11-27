use anchor_lang::prelude::*;

/// PRD §4.5.
#[event]
pub struct VaultInitialized {
    pub vault: Pubkey,
    pub owner: Pubkey,
    pub agent_delegate: Pubkey,
    pub max_per_tx: u64,
    pub daily_cap: u64,
    pub cooldown_secs: i64,
}

#[event]
pub struct Deposited {
    pub vault: Pubkey,
    pub amount: u64,
    pub new_balance: u64,
}

#[event]
pub struct PolicyUpdated {
    pub vault: Pubkey,
    pub max_per_tx: u64,
    pub daily_cap: u64,
    pub cooldown_secs: i64,
    pub allowlist_len: u8,
}

/// Binds the on-chain transfer to the off-chain evidence (PRD §6.6).
#[event]
pub struct ExecutionAudited {
    pub vault: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub evidence_hash: [u8; 32],
    pub daily_spent: u64,
    pub tx_count: u64,
    pub ts: i64,
}

#[event]
pub struct FreezeToggled {
    pub vault: Pubkey,
    pub frozen: bool,
    pub ts: i64,
}

#[event]
pub struct Withdrawn {
    pub vault: Pubkey,
    pub amount: u64,
}
