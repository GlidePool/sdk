# @glide-pool/sdk

JavaScript SDK for the [GlidePool](https://github.com/GlidePool/glidepool) autonomous DLMM agent API on Base Mainnet.

## Installation

```bash
npm install @glide-pool/sdk
```

## Quick Start

```js
import { GlidePoolClient } from '@glide-pool/sdk';

const client = new GlidePoolClient({
  apiUrl: 'https://api.glidepool.xyz',
});

// List live Maverick V2 pools
const pools = await client.listPools();
console.log(pools);
// [{ poolAddress, tokenASymbol, tokenBSymbol, tvlUsd, currentPrice, feeRate, ... }]

// Create an autonomous agent
const agent = await client.createAgent({
  userAddress: '0xYourWallet',
  poolAddress: '0x3d70b2f31f75dc84acdd5e1588695221959b2d37',
  strategy: 'balanced',
  budgetUsdc: 100,
  analysisIntervalSec: 60,
});
console.log(agent.id); // UUID — agent loop starts immediately on the server

// Check LLM decisions
const actions = await client.getAgentActions(agent.id);
console.log(actions[0].actionType);    // 'hold' | 'rebalance' | 'withdraw' ...
console.log(actions[0].llmReasoning);  // Claude Opus 4 reasoning text
```

## API Reference

### Constructor

```js
const client = new GlidePoolClient({ apiUrl: 'https://...' });
```

| Option | Type | Required | Description |
|---|---|---|---|
| `apiUrl` | `string` | ✅ | Base URL of your GlidePool API server |

---

### Pools

#### `client.listPools()`
Returns all supported Maverick V2 pools with live TVL, price, and fee rate from Base Mainnet.

```js
const pools = await client.listPools();
// Pool[] — see types
```

#### `client.getPool(poolAddress)`
Get details for a specific pool by contract address.

---

### Agents

#### `client.createAgent(params)`

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `userAddress` | `string` | ✅ | — | Wallet address that owns the agent |
| `poolAddress` | `string` | ✅ | — | Maverick V2 pool to monitor |
| `strategy` | `string` | ✅ | — | `'conservative'` \| `'balanced'` \| `'aggressive'` |
| `budgetUsdc` | `number` | ✅ | — | Max USDC budget for liquidity operations |
| `analysisIntervalSec` | `number` | ❌ | `60` | LLM analysis frequency in seconds (min: 30) |

#### `client.listAgents(userAddress)`
List all agents for a wallet.

#### `client.getAgent(agentId)`
Get a single agent by UUID.

#### `client.pauseAgent(agentId)` / `resumeAgent(agentId)` / `stopAgent(agentId)`
Control agent lifecycle. `stop` is permanent.

#### `client.getAgentActions(agentId, limit?)`
Get LLM decisions stored in the database. Each entry has:
- `actionType` — `hold` | `rebalance` | `withdraw` | `add_liquidity` | `switch_mode`
- `status` — `completed` | `pending_signature` | `signed` | `failed`
- `llmReasoning` — Full Claude Opus 4 reasoning text
- `llmRecommendation` — Structured recommendation with `riskLevel`, `suggestedBinRange`, etc.
- `txHash` — Set after user signs and confirms

#### `client.confirmAgentAction(agentId, actionId, txHash)`
After signing a `pending_signature` action in your wallet, submit the tx hash.

---

### Positions

#### `client.getUserPositions(walletAddress)`
List all Maverick V2 NFT-based LP positions for a wallet on Base Mainnet.

Returns `valueUsd`, `amountA`, `amountB`, `binCount`, `nftId`, and token symbols.

---

### Advisor (x402 gated)

#### `client.getAdvice(params)`

```js
const advice = await client.getAdvice({
  poolAddress: '0x3d70...',
  userGoal: 'maximize fee income with minimal impermanent loss',
  // nftId: '123',        // optional: analyze existing position
  // paymentProof: '...',  // required if server has X402_ENABLED=true
});

console.log(advice.recommendation.action);   // 'hold' | 'rebalance' | ...
console.log(advice.riskLevel);               // 'low' | 'medium' | 'high'
console.log(advice.summary);                 // Human-readable summary
```

**x402 micropayments:** If `X402_ENABLED=true` on the server, the call will throw with `status: 402` and include `recipient`, `amount`, `token`, and `network` in `err.data`. Send 0.05 USDC to `recipient` on Base, then encode the proof:

```js
const proof = Buffer.from(JSON.stringify({
  txHash: '0x...',
  from: '0xYourWallet',
  amount: '0.05',
})).toString('base64');

const advice = await client.getAdvice({ poolAddress, userGoal, paymentProof: proof });
```

---

### Liquidity

#### `client.getRemoveParams(params)`
Compute remove-liquidity calldata for a position. Returns `binIds`, estimated token amounts. **You sign the transaction — the server never holds your keys.**

#### `client.getAddParams(params)`
Compute add-liquidity calldata for a pool. Returns encoded calldata for the `addLiquidity` transaction.

---

## Strategies

| Strategy | Mode | Description |
|---|---|---|
| `conservative` | Static | Tight fixed bin range, low risk, suited for stable pairs |
| `balanced` | Both | Follows price in both directions, medium risk |
| `aggressive` | Right/Left | Follows price trend, higher exposure |

Claude Opus 4 analyzes pool state each cycle and may override the strategy when conditions warrant caution.

## TypeScript

Full TypeScript types are included:

```ts
import { GlidePoolClient, Agent, Pool, AgentAction, Advice } from '@glide-pool/sdk';
```

## Requirements

- Node.js >= 18 (uses native `fetch`)
- A running GlidePool API server

## License

MIT
