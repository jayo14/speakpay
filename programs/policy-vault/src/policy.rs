//! Pure policy logic for `execute_guarded_transfer` (PRD §4.3).
//!
//! Kept free of account types so the exact check order can be unit-tested on the
//! host with `cargo test`, without a validator.

use anchor_lang::prelude::Pubkey;

use crate::errors::PolicyError;

pub const SECONDS_PER_DAY: i64 = 86_400;
pub const MAX_ALLOWLIST: usize = 5;

/// Snapshot of the vault fields the transfer checks read.
pub struct TransferPolicy<'a> {
    pub agent_delegate: Pubkey,
    pub is_frozen: bool,
    pub max_per_tx: u64,
    pub daily_cap: u64,
    pub daily_spent: u64,
    pub window_start_ts: i64,
    pub cooldown_secs: i64,
    pub last_tx_ts: i64,
    pub allowlist: &'a [Pubkey],
}

pub struct TransferRequest {
    pub signer: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub now: i64,
    pub vault_balance: u64,
    pub rent_min: u64,
}

/// New counter values to write back after a successful check.
#[derive(Debug, PartialEq, Eq)]
pub struct TransferOutcome {
    pub daily_spent: u64,
    pub window_start_ts: i64,
}

/// Runs every policy check in the locked order. First failure wins.
pub fn check_transfer(
    p: &TransferPolicy<'_>,
    r: &TransferRequest,
) -> Result<TransferOutcome, PolicyError> {
    // 1. Only the bound delegate may spend.
    if r.signer != p.agent_delegate {
        return Err(PolicyError::UnauthorizedAgent);
    }
    // 2. Kill switch.
    if p.is_frozen {
        return Err(PolicyError::VaultFrozen);
    }
    // 3. Per-transaction limit.
    if r.amount == 0 || r.amount > p.max_per_tx {
        return Err(PolicyError::ExceedsMaxPerTx);
    }
    // 4. Roll the 24 h window.
    let elapsed = r
        .now
        .checked_sub(p.window_start_ts)
        .ok_or(PolicyError::MathOverflow)?;
    let (mut daily_spent, mut window_start_ts) = (p.daily_spent, p.window_start_ts);
    if elapsed >= SECONDS_PER_DAY {
        daily_spent = 0;
        window_start_ts = r.now;
    }
    // 5. Daily cap.
    let new_spent = daily_spent
        .checked_add(r.amount)
        .ok_or(PolicyError::MathOverflow)?;
    if new_spent > p.daily_cap {
        return Err(PolicyError::ExceedsDailyCap);
    }
    // 6. Cooldown.
    if p.last_tx_ts != 0 {
        let since = r
            .now
            .checked_sub(p.last_tx_ts)
            .ok_or(PolicyError::MathOverflow)?;
        if since < p.cooldown_secs {
            return Err(PolicyError::CooldownActive);
        }
    }
    // 7. Allowlist (empty = open).
    if !p.allowlist.is_empty() && !p.allowlist.contains(&r.recipient) {
        return Err(PolicyError::RecipientNotAllowlisted);
    }
    // 8. Balance, keeping the rent-exempt minimum.
    let needed = r
        .amount
        .checked_add(r.rent_min)
        .ok_or(PolicyError::MathOverflow)?;
    if r.vault_balance < needed {
        return Err(PolicyError::InsufficientVaultBalance);
    }

    Ok(TransferOutcome {
        daily_spent: new_spent,
        window_start_ts,
    })
}

/// Validation shared by `init_policy_vault` and `update_policy`.
pub fn validate_policy(
    max_per_tx: u64,
    daily_cap: u64,
    cooldown_secs: i64,
    allowlist_len: usize,
) -> Result<(), PolicyError> {
    if allowlist_len > MAX_ALLOWLIST {
        return Err(PolicyError::AllowlistTooLong);
    }
    if max_per_tx == 0 || max_per_tx > daily_cap || cooldown_secs < 0 {
        return Err(PolicyError::InvalidPolicy);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const SOL: u64 = 1_000_000_000;
    const RENT: u64 = 890_880;
    const T0: i64 = 1_800_000_000;

    fn keys() -> (Pubkey, Pubkey, Pubkey) {
        (Pubkey::new_unique(), Pubkey::new_unique(), Pubkey::new_unique())
    }

    // Demo constants from PRD §2.
    fn policy<'a>(delegate: Pubkey, allow: &'a [Pubkey]) -> TransferPolicy<'a> {
        TransferPolicy {
            agent_delegate: delegate,
            is_frozen: false,
            max_per_tx: SOL / 20,  // 0.05
            daily_cap: SOL * 3 / 20, // 0.15
            daily_spent: 0,
            window_start_ts: T0,
            cooldown_secs: 30,
            last_tx_ts: 0,
            allowlist: allow,
        }
    }

    fn req(signer: Pubkey, recipient: Pubkey, amount: u64) -> TransferRequest {
        TransferRequest {
            signer,
            recipient,
            amount,
            now: T0 + 10,
            vault_balance: SOL / 5, // 0.20 deposit
            rent_min: RENT,
        }
    }

    #[test]
    fn compliant_payment_passes() {
        let (d, m, _) = keys();
        let allow = [m];
        let out = check_transfer(&policy(d, &allow), &req(d, m, SOL / 50)).unwrap();
        assert_eq!(out.daily_spent, SOL / 50);
        assert_eq!(out.window_start_ts, T0);
    }

    #[test]
    fn wrong_signer_is_unauthorized() {
        let (d, m, x) = keys();
        let r = check_transfer(&policy(d, &[]), &req(x, m, 1));
        assert!(matches!(r, Err(PolicyError::UnauthorizedAgent)));
    }

    #[test]
    fn frozen_beats_amount_checks() {
        let (d, m, _) = keys();
        let mut p = policy(d, &[]);
        p.is_frozen = true;
        // Compliant amount still fails: the post-freeze demo proof.
        let r = check_transfer(&p, &req(d, m, SOL / 100));
        assert!(matches!(r, Err(PolicyError::VaultFrozen)));
    }

    #[test]
    fn rogue_half_sol_reports_max_per_tx_first() {
        // 0.5 SOL also breaks the cap, the allowlist and the balance; order says max_per_tx.
        let (d, m, x) = keys();
        let allow = [m];
        let mut p = policy(d, &allow);
        p.last_tx_ts = T0 + 5; // cooldown also active
        let r = check_transfer(&p, &req(d, x, SOL / 2));
        assert!(matches!(r, Err(PolicyError::ExceedsMaxPerTx)));
    }

    #[test]
    fn zero_amount_rejected() {
        let (d, m, _) = keys();
        let r = check_transfer(&policy(d, &[]), &req(d, m, 0));
        assert!(matches!(r, Err(PolicyError::ExceedsMaxPerTx)));
    }

    #[test]
    fn daily_cap_enforced() {
        let (d, m, _) = keys();
        let mut p = policy(d, &[]);
        p.daily_spent = SOL * 3 / 20 - SOL / 100; // 0.14 spent
        let r = check_transfer(&p, &req(d, m, SOL / 50));
        assert!(matches!(r, Err(PolicyError::ExceedsDailyCap)));
    }

    #[test]
    fn window_rolls_after_24h() {
        let (d, m, _) = keys();
        let mut p = policy(d, &[]);
        p.daily_spent = SOL * 3 / 20;
        let mut q = req(d, m, SOL / 50);
        q.now = T0 + SECONDS_PER_DAY;
        let out = check_transfer(&p, &q).unwrap();
        assert_eq!(out.daily_spent, SOL / 50);
        assert_eq!(out.window_start_ts, q.now);
    }

    #[test]
    fn cooldown_enforced_then_expires() {
        let (d, m, _) = keys();
        let mut p = policy(d, &[]);
        p.last_tx_ts = T0;
        let mut q = req(d, m, SOL / 50);
        q.now = T0 + 29;
        assert!(matches!(check_transfer(&p, &q), Err(PolicyError::CooldownActive)));
        q.now = T0 + 30;
        assert!(check_transfer(&p, &q).is_ok());
    }

    #[test]
    fn allowlist_enforced_when_non_empty() {
        let (d, m, x) = keys();
        let allow = [m];
        let r = check_transfer(&policy(d, &allow), &req(d, x, SOL / 50));
        assert!(matches!(r, Err(PolicyError::RecipientNotAllowlisted)));
        assert!(check_transfer(&policy(d, &[]), &req(d, x, SOL / 50)).is_ok());
    }

    #[test]
    fn rent_minimum_must_remain() {
        let (d, m, _) = keys();
        let mut q = req(d, m, SOL / 50);
        q.vault_balance = SOL / 50 + RENT - 1;
        let r = check_transfer(&policy(d, &[]), &q);
        assert!(matches!(r, Err(PolicyError::InsufficientVaultBalance)));
        q.vault_balance += 1;
        assert!(check_transfer(&policy(d, &[]), &q).is_ok());
    }

    #[test]
    fn policy_validation() {
        assert!(validate_policy(SOL / 20, SOL * 3 / 20, 30, 5).is_ok());
        assert!(matches!(validate_policy(1, 2, 0, 6), Err(PolicyError::AllowlistTooLong)));
        assert!(matches!(validate_policy(0, 2, 0, 0), Err(PolicyError::InvalidPolicy)));
        assert!(matches!(validate_policy(3, 2, 0, 0), Err(PolicyError::InvalidPolicy)));
        assert!(matches!(validate_policy(1, 2, -1, 0), Err(PolicyError::InvalidPolicy)));
    }

    #[test]
    fn error_codes_are_locked() {
        // PRD §4.4: numeric codes are in README, video and tests. Append only.
        let codes = [
            PolicyError::VaultFrozen,
            PolicyError::ExceedsMaxPerTx,
            PolicyError::ExceedsDailyCap,
            PolicyError::CooldownActive,
            PolicyError::RecipientNotAllowlisted,
            PolicyError::UnauthorizedAgent,
            PolicyError::InsufficientVaultBalance,
            PolicyError::AllowlistTooLong,
            PolicyError::InvalidPolicy,
            PolicyError::MathOverflow,
        ];
        for (i, e) in codes.into_iter().enumerate() {
            assert_eq!(u32::from(e), 6000 + i as u32);
        }
    }
}
