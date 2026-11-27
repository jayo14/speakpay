//! SpeakPay `policy_vault` — validator-enforced spending limits for an AI agent.
//!
//! The owner (MWA / Wallet Adapter) creates and funds a vault and sets policy.
//! A scoped `agent_delegate` key may move funds only through
//! `execute_guarded_transfer`, which enforces the PRD §4.3 checks on-chain.

use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

pub mod errors;
pub mod events;
pub mod policy;
pub mod state;

use errors::PolicyError;
use events::*;
use policy::{check_transfer, validate_policy, TransferPolicy, TransferRequest};
use state::*;

declare_id!("2ZgTwPCnLhXTwTNW8AZKoxuh6zy1NKgCTr3ekbch8YfU");

#[program]
pub mod policy_vault {
    use super::*;

    /// Creates the PolicyVault PDA with hard limits and binds the agent delegate.
    pub fn init_policy_vault(
        ctx: Context<InitPolicyVault>,
        agent_delegate: Pubkey,
        max_per_tx: u64,
        daily_cap: u64,
        cooldown_secs: i64,
        allowlist: Vec<Pubkey>,
    ) -> Result<()> {
        validate_policy(max_per_tx, daily_cap, cooldown_secs, allowlist.len())?;
        let now = Clock::get()?.unix_timestamp;
        let vault_key = ctx.accounts.policy_vault.key();
        let v = &mut ctx.accounts.policy_vault;
        v.owner = ctx.accounts.owner.key();
        v.agent_delegate = agent_delegate;
        v.max_per_tx = max_per_tx;
        v.daily_cap = daily_cap;
        v.daily_spent = 0;
        v.window_start_ts = now;
        v.cooldown_secs = cooldown_secs;
        v.last_tx_ts = 0;
        v.is_frozen = false;
        v.allowlist = allowlist;
        v.last_evidence_hash = [0u8; 32];
        v.tx_count = 0;
        v.bump = ctx.bumps.policy_vault;
        v.funds_bump = ctx.bumps.vault_funds;
        emit!(VaultInitialized {
            vault: vault_key,
            owner: v.owner,
            agent_delegate,
            max_per_tx,
            daily_cap,
            cooldown_secs,
        });
        Ok(())
    }

    /// Owner funds the VaultFunds PDA with native SOL.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                Transfer {
                    from: ctx.accounts.owner.to_account_info(),
                    to: ctx.accounts.vault_funds.to_account_info(),
                },
            ),
            amount,
        )?;
        emit!(Deposited {
            vault: ctx.accounts.policy_vault.key(),
            amount,
            new_balance: ctx.accounts.vault_funds.lamports(),
        });
        Ok(())
    }

    /// Full replace of the policy. Does not reset `daily_spent`.
    pub fn update_policy(
        ctx: Context<OwnerOnly>,
        max_per_tx: u64,
        daily_cap: u64,
        cooldown_secs: i64,
        allowlist: Vec<Pubkey>,
        agent_delegate: Pubkey,
    ) -> Result<()> {
        validate_policy(max_per_tx, daily_cap, cooldown_secs, allowlist.len())?;
        let vault_key = ctx.accounts.policy_vault.key();
        let v = &mut ctx.accounts.policy_vault;
        v.max_per_tx = max_per_tx;
        v.daily_cap = daily_cap;
        v.cooldown_secs = cooldown_secs;
        v.allowlist = allowlist;
        v.agent_delegate = agent_delegate;
        emit!(PolicyUpdated {
            vault: vault_key,
            max_per_tx,
            daily_cap,
            cooldown_secs,
            allowlist_len: v.allowlist.len() as u8,
        });
        Ok(())
    }

    /// Autonomous payment signed by the agent delegate, inside on-chain limits.
    pub fn execute_guarded_transfer(
        ctx: Context<ExecuteGuardedTransfer>,
        amount: u64,
        evidence_hash: [u8; 32],
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let rent_min = Rent::get()?.minimum_balance(0);
        let vault_key = ctx.accounts.policy_vault.key();
        let recipient = ctx.accounts.recipient.key();

        let outcome = {
            let v = &ctx.accounts.policy_vault;
            check_transfer(
                &TransferPolicy {
                    agent_delegate: v.agent_delegate,
                    is_frozen: v.is_frozen,
                    max_per_tx: v.max_per_tx,
                    daily_cap: v.daily_cap,
                    daily_spent: v.daily_spent,
                    window_start_ts: v.window_start_ts,
                    cooldown_secs: v.cooldown_secs,
                    last_tx_ts: v.last_tx_ts,
                    allowlist: &v.allowlist,
                },
                &TransferRequest {
                    signer: ctx.accounts.agent_delegate.key(),
                    recipient,
                    amount,
                    now,
                    vault_balance: ctx.accounts.vault_funds.lamports(),
                    rent_min,
                },
            )?
        };

        let funds_bump = ctx.accounts.policy_vault.funds_bump;
        let signer_seeds: &[&[&[u8]]] = &[&[VAULT_FUNDS_SEED, vault_key.as_ref(), &[funds_bump]]];
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.key(),
                Transfer {
                    from: ctx.accounts.vault_funds.to_account_info(),
                    to: ctx.accounts.recipient.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        let v = &mut ctx.accounts.policy_vault;
        v.daily_spent = outcome.daily_spent;
        v.window_start_ts = outcome.window_start_ts;
        v.last_tx_ts = now;
        v.tx_count = v.tx_count.checked_add(1).ok_or(PolicyError::MathOverflow)?;
        v.last_evidence_hash = evidence_hash;
        emit!(ExecutionAudited {
            vault: vault_key,
            recipient,
            amount,
            evidence_hash,
            daily_spent: v.daily_spent,
            tx_count: v.tx_count,
            ts: now,
        });
        Ok(())
    }

    /// Owner kill switch. Frozen vaults reject every delegate transfer.
    pub fn toggle_freeze(ctx: Context<OwnerOnly>, frozen: bool) -> Result<()> {
        let vault_key = ctx.accounts.policy_vault.key();
        ctx.accounts.policy_vault.is_frozen = frozen;
        emit!(FreezeToggled {
            vault: vault_key,
            frozen,
            ts: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    /// Owner drains the vault to zero. Works while frozen.
    pub fn withdraw_all(ctx: Context<WithdrawAll>) -> Result<()> {
        let amount = ctx.accounts.vault_funds.lamports();
        if amount > 0 {
            let vault_key = ctx.accounts.policy_vault.key();
            let funds_bump = ctx.accounts.policy_vault.funds_bump;
            let signer_seeds: &[&[&[u8]]] =
                &[&[VAULT_FUNDS_SEED, vault_key.as_ref(), &[funds_bump]]];
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.key(),
                    Transfer {
                        from: ctx.accounts.vault_funds.to_account_info(),
                        to: ctx.accounts.owner.to_account_info(),
                    },
                    signer_seeds,
                ),
                amount,
            )?;
        }
        emit!(Withdrawn {
            vault: ctx.accounts.policy_vault.key(),
            amount,
        });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitPolicyVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        payer = owner,
        space = 8 + PolicyVault::INIT_SPACE,
        seeds = [POLICY_VAULT_SEED, owner.key().as_ref()],
        bump,
    )]
    pub policy_vault: Account<'info, PolicyVault>,
    /// System-owned, zero-data PDA that holds the vault's lamports.
    #[account(seeds = [VAULT_FUNDS_SEED, policy_vault.key().as_ref()], bump)]
    pub vault_funds: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        has_one = owner,
        seeds = [POLICY_VAULT_SEED, owner.key().as_ref()],
        bump = policy_vault.bump,
    )]
    pub policy_vault: Account<'info, PolicyVault>,
    #[account(
        mut,
        seeds = [VAULT_FUNDS_SEED, policy_vault.key().as_ref()],
        bump = policy_vault.funds_bump,
    )]
    pub vault_funds: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

/// Shared by `update_policy` and `toggle_freeze`.
#[derive(Accounts)]
pub struct OwnerOnly<'info> {
    pub owner: Signer<'info>,
    #[account(
        mut,
        has_one = owner,
        seeds = [POLICY_VAULT_SEED, owner.key().as_ref()],
        bump = policy_vault.bump,
    )]
    pub policy_vault: Account<'info, PolicyVault>,
}

#[derive(Accounts)]
pub struct ExecuteGuardedTransfer<'info> {
    /// Pays the fee. Checked against `policy_vault.agent_delegate` in the
    /// handler (not via `has_one`) so `UnauthorizedAgent` surfaces as 6005.
    #[account(mut)]
    pub agent_delegate: Signer<'info>,
    #[account(
        mut,
        seeds = [POLICY_VAULT_SEED, policy_vault.owner.as_ref()],
        bump = policy_vault.bump,
    )]
    pub policy_vault: Account<'info, PolicyVault>,
    #[account(
        mut,
        seeds = [VAULT_FUNDS_SEED, policy_vault.key().as_ref()],
        bump = policy_vault.funds_bump,
    )]
    pub vault_funds: SystemAccount<'info>,
    #[account(mut)]
    pub recipient: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawAll<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        has_one = owner,
        seeds = [POLICY_VAULT_SEED, owner.key().as_ref()],
        bump = policy_vault.bump,
    )]
    pub policy_vault: Account<'info, PolicyVault>,
    #[account(
        mut,
        seeds = [VAULT_FUNDS_SEED, policy_vault.key().as_ref()],
        bump = policy_vault.funds_bump,
    )]
    pub vault_funds: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}
