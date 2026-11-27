use anchor_lang::prelude::*;

/// PRD §4.4. Variant order defines the on-chain code (6000 + index).
/// APPEND ONLY — never reorder or insert.
#[error_code]
pub enum PolicyError {
    #[msg("Vault is frozen by its owner.")]
    VaultFrozen, // 6000
    #[msg("Amount exceeds the per-transaction limit.")]
    ExceedsMaxPerTx, // 6001
    #[msg("Amount exceeds the remaining daily cap.")]
    ExceedsDailyCap, // 6002
    #[msg("Cooldown period has not elapsed.")]
    CooldownActive, // 6003
    #[msg("Recipient is not on the allowlist.")]
    RecipientNotAllowlisted, // 6004
    #[msg("Signer is not this vault's agent delegate.")]
    UnauthorizedAgent, // 6005
    #[msg("Vault balance too low (rent-exempt minimum must remain).")]
    InsufficientVaultBalance, // 6006
    #[msg("Allowlist exceeds 5 entries.")]
    AllowlistTooLong, // 6007
    #[msg("max_per_tx must be > 0 and <= daily_cap; cooldown >= 0.")]
    InvalidPolicy, // 6008
    #[msg("Arithmetic overflow.")]
    MathOverflow, // 6009
}
