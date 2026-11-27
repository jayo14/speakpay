/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/policy_vault.json`.
 */
export type PolicyVault = {
  "address": "BdaaSSmvhANBA14KdYadNvgnYLUnZwPFBSVmzbTV1orf",
  "metadata": {
    "name": "policyVault",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "SpeakPay policy vault: validator-enforced spending limits for an AI agent delegate"
  },
  "instructions": [
    {
      "name": "deposit",
      "docs": [
        "Owner funds the VaultFunds PDA with native SOL."
      ],
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "policyVault"
          ]
        },
        {
          "name": "policyVault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  108,
                  105,
                  99,
                  121,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "vaultFunds",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  102,
                  117,
                  110,
                  100,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "policyVault"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "executeGuardedTransfer",
      "docs": [
        "Autonomous payment signed by the agent delegate, inside on-chain limits."
      ],
      "discriminator": [
        164,
        162,
        46,
        137,
        233,
        205,
        143,
        64
      ],
      "accounts": [
        {
          "name": "agentDelegate",
          "docs": [
            "Pays the fee. Checked against `policy_vault.agent_delegate` in the",
            "handler (not via `has_one`) so `UnauthorizedAgent` surfaces as 6005."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "policyVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  108,
                  105,
                  99,
                  121,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "policyVault.owner",
                "account": "policyVault"
              }
            ]
          }
        },
        {
          "name": "vaultFunds",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  102,
                  117,
                  110,
                  100,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "policyVault"
              }
            ]
          }
        },
        {
          "name": "recipient",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "evidenceHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "initPolicyVault",
      "docs": [
        "Creates the PolicyVault PDA with hard limits and binds the agent delegate."
      ],
      "discriminator": [
        237,
        33,
        233,
        29,
        224,
        210,
        219,
        11
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "policyVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  108,
                  105,
                  99,
                  121,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "vaultFunds",
          "docs": [
            "System-owned, zero-data PDA that holds the vault's lamports."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  102,
                  117,
                  110,
                  100,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "policyVault"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "agentDelegate",
          "type": "pubkey"
        },
        {
          "name": "maxPerTx",
          "type": "u64"
        },
        {
          "name": "dailyCap",
          "type": "u64"
        },
        {
          "name": "cooldownSecs",
          "type": "i64"
        },
        {
          "name": "allowlist",
          "type": {
            "vec": "pubkey"
          }
        }
      ]
    },
    {
      "name": "toggleFreeze",
      "docs": [
        "Owner kill switch. Frozen vaults reject every delegate transfer."
      ],
      "discriminator": [
        136,
        3,
        54,
        90,
        252,
        134,
        158,
        172
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "policyVault"
          ]
        },
        {
          "name": "policyVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  108,
                  105,
                  99,
                  121,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "frozen",
          "type": "bool"
        }
      ]
    },
    {
      "name": "updatePolicy",
      "docs": [
        "Full replace of the policy. Does not reset `daily_spent`."
      ],
      "discriminator": [
        212,
        245,
        246,
        7,
        163,
        151,
        18,
        57
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "policyVault"
          ]
        },
        {
          "name": "policyVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  108,
                  105,
                  99,
                  121,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "maxPerTx",
          "type": "u64"
        },
        {
          "name": "dailyCap",
          "type": "u64"
        },
        {
          "name": "cooldownSecs",
          "type": "i64"
        },
        {
          "name": "allowlist",
          "type": {
            "vec": "pubkey"
          }
        },
        {
          "name": "agentDelegate",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "withdrawAll",
      "docs": [
        "Owner drains the vault to zero. Works while frozen."
      ],
      "discriminator": [
        96,
        246,
        166,
        130,
        229,
        50,
        43,
        70
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "policyVault"
          ]
        },
        {
          "name": "policyVault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  108,
                  105,
                  99,
                  121,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "vaultFunds",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  102,
                  117,
                  110,
                  100,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "policyVault"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "policyVault",
      "discriminator": [
        180,
        22,
        67,
        48,
        87,
        214,
        158,
        120
      ]
    }
  ],
  "events": [
    {
      "name": "deposited",
      "discriminator": [
        111,
        141,
        26,
        45,
        161,
        35,
        100,
        57
      ]
    },
    {
      "name": "executionAudited",
      "discriminator": [
        65,
        109,
        145,
        209,
        106,
        97,
        211,
        48
      ]
    },
    {
      "name": "freezeToggled",
      "discriminator": [
        39,
        108,
        182,
        95,
        17,
        73,
        241,
        163
      ]
    },
    {
      "name": "policyUpdated",
      "discriminator": [
        225,
        112,
        112,
        67,
        95,
        236,
        245,
        161
      ]
    },
    {
      "name": "vaultInitialized",
      "discriminator": [
        180,
        43,
        207,
        2,
        18,
        71,
        3,
        75
      ]
    },
    {
      "name": "withdrawn",
      "discriminator": [
        20,
        89,
        223,
        198,
        194,
        124,
        219,
        13
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "vaultFrozen",
      "msg": "Vault is frozen by its owner."
    },
    {
      "code": 6001,
      "name": "exceedsMaxPerTx",
      "msg": "Amount exceeds the per-transaction limit."
    },
    {
      "code": 6002,
      "name": "exceedsDailyCap",
      "msg": "Amount exceeds the remaining daily cap."
    },
    {
      "code": 6003,
      "name": "cooldownActive",
      "msg": "Cooldown period has not elapsed."
    },
    {
      "code": 6004,
      "name": "recipientNotAllowlisted",
      "msg": "Recipient is not on the allowlist."
    },
    {
      "code": 6005,
      "name": "unauthorizedAgent",
      "msg": "Signer is not this vault's agent delegate."
    },
    {
      "code": 6006,
      "name": "insufficientVaultBalance",
      "msg": "Vault balance too low (rent-exempt minimum must remain)."
    },
    {
      "code": 6007,
      "name": "allowlistTooLong",
      "msg": "Allowlist exceeds 5 entries."
    },
    {
      "code": 6008,
      "name": "invalidPolicy",
      "msg": "max_per_tx must be > 0 and <= daily_cap; cooldown >= 0."
    },
    {
      "code": 6009,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow."
    }
  ],
  "types": [
    {
      "name": "deposited",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "newBalance",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "executionAudited",
      "docs": [
        "Binds the on-chain transfer to the off-chain evidence (PRD §6.6)."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "evidenceHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "dailySpent",
            "type": "u64"
          },
          {
            "name": "txCount",
            "type": "u64"
          },
          {
            "name": "ts",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "freezeToggled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "frozen",
            "type": "bool"
          },
          {
            "name": "ts",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "policyUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "maxPerTx",
            "type": "u64"
          },
          {
            "name": "dailyCap",
            "type": "u64"
          },
          {
            "name": "cooldownSecs",
            "type": "i64"
          },
          {
            "name": "allowlistLen",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "policyVault",
      "docs": [
        "PRD §4.1 — LOCKED layout. Changing it requires redeploy + vault re-init.",
        "Seeds: [b\"policy_vault\", owner]."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "agentDelegate",
            "type": "pubkey"
          },
          {
            "name": "maxPerTx",
            "type": "u64"
          },
          {
            "name": "dailyCap",
            "type": "u64"
          },
          {
            "name": "dailySpent",
            "type": "u64"
          },
          {
            "name": "windowStartTs",
            "type": "i64"
          },
          {
            "name": "cooldownSecs",
            "type": "i64"
          },
          {
            "name": "lastTxTs",
            "type": "i64"
          },
          {
            "name": "isFrozen",
            "type": "bool"
          },
          {
            "name": "allowlist",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "lastEvidenceHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "txCount",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "fundsBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "vaultInitialized",
      "docs": [
        "PRD §4.5."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "agentDelegate",
            "type": "pubkey"
          },
          {
            "name": "maxPerTx",
            "type": "u64"
          },
          {
            "name": "dailyCap",
            "type": "u64"
          },
          {
            "name": "cooldownSecs",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "withdrawn",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
