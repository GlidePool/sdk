# @glide-pool/sdk

JavaScript and TypeScript SDK for the GlidePool autonomous DLMM agent API on Base Mainnet.

Zero runtime dependencies. Uses native `fetch` (Node.js 18+). Full TypeScript declarations included.

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
// [{ poolAddress, tokenASymbol, tokenBSymbol, tvlUsd, currentPrice, feeRate, ... }]

// Create an autonomous agent
const agent = await client.createAgent({
  userAddress: '0xYourWallet',
  poolAddress: '0x3d70b2f31f75dc84acdd5e1588695221959b2d37',
  strategy: 'balanced',
  budgetUsdc: 100,
  analysisIntervalSec: 60,
});
// Agent loop starts immediately on the server

// Check LLM decisions
const actions = await client.getAgentActions(agent.id);
// actionType: 'hold' | 'rebalance' | 'withdraw' | 'add_liquidity' | 'switch_mode'
// llmReasoning: Claude Opus 4 full reasoning text
```

## API Reference

### Constructor

```js
const client = new GlidePoolClient({ apiUrl: 'https://...' });
```

| Option | Type | Required | Description |
|---|---|---|---|
| `apiUrl` | `string` | yes | Base URL of your GlidePool API server |

### Pools

#### `client.listPools()`
Returns all supported Maverick V2 pools with live TVL, price, and fee rate from Base Mainnet.

#### `client.getPool(poolAddress)`
Get details for a specific pool by contract address.

### Agents

#### `client.createAgent(params)`

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `userAddress` | `string` | yes | | Wallet address that owns the agent |
| `poolAddress` | `string` | yes | | Maverick V2 pool to monitor |
| `strategy` | `string` | yes | | `conservative`, `balanced`, or `aggressive` |
| `budgetUsdc` | `number` | yes | | Max USDC budget |
| `analysisIntervalSec` | `number` | no | 60 | LLM analysis frequency in seconds (min 30) |

#### `client.listAgents(userAddress)`
List all agents for a wallet address.

#### `client.getAgent(agentId)`
Get a single agent by UUID.

#### `client.pauseAgent(agentId)`
Pause a running agent. Analysis loop stops until resumed.

#### `client.resumeAgent(agentId)`
Resume a paused agent.

#### `client.stopAgent(agentId)`
Stop an agent permanently.

#### `client.getAgentActions(agentId, limit?)`
Get LLM decisions stored in the database. Each action has:

| Field | Type | Description |
|---|---|---|
| `actionType` | `string` | `hold`, `rebalance`, `withdraw`, `add_liquidity`, `switch_mode` |
| `status` | `string` | `completed`, `pending_signature`, `signed`, `failed` |
| `llmReasoning` | `string` | Full Claude Opus 4 reasoning text |
| `llmRecommendation` | `object` | Structured recommendation with `riskLevel`, `suggestedBinRange`, `suggestedWithdrawPercent` |
| `txHash` | `string` | Set after user signs and confirms on-chain |

#### `client.confirmAgentAction(agentId, actionId, txHash)`
After signing a `pending_signature` action in your wallet, submit the transaction hash to mark it confirmed.

### Positions

#### `client.getUserPositions(walletAddress)`
List all Maverick V2 NFT-based LP positions for a wallet on Base Mainnet.

Returns `valueUsd`, `amountA`, `amountB`, `binCount`, `nftId`, and token symbols.

### Advisor

#### `client.getAdvice(params)`

```js
const advice = await client.getAdvice({
  poolAddress: '0x3d70b2f31f75dc84acdd5e1588695221959b2d37',
  userGoal: 'maximize fee income with minimal impermanent loss',
  nftId: '123',         // optional: analyze existing position
  paymentProof: '...',  // required if server has X402_ENABLED=true
});

console.log(advice.recommendation.action);  // 'hold' | 'rebalance' | ...
console.log(advice.riskLevel);              // 'low' | 'medium' | 'high'
console.log(advice.summary);               // human-readable summary
```

**x402 payments:** If `X402_ENABLED=true` on the server, calls to this method throw with `status: 402` and include `recipient`, `amount`, `token`, and `network` in `err.data`. Send 0.05 USDC to `recipient` on Base, then encode the proof:

```js
const proof = Buffer.from(JSON.stringify({
  txHash: '0x...',
  from: '0xYourWallet',
  amount: '0.05',
})).toString('base64');

const advice = await client.getAdvice({ poolAddress, userGoal, paymentProof: proof });
```

### Liquidity

#### `client.getRemoveParams(params)`
Compute remove-liquidity calldata for a position. Returns `binIds` and estimated token amounts. The API server never signs transactions.

#### `client.getAddParams(params)`
Compute add-liquidity calldata for a pool. Returns encoded calldata for the `addLiquidity` transaction.

## Strategies

| Strategy | Mode | Description |
|---|---|---|
| `conservative` | Static | Tight fixed bin range, low risk, suited for stable pairs |
| `balanced` | Both | Follows price in both directions, medium risk |
| `aggressive` | Right or Left | Follows price trend, higher exposure |

Claude Opus 4 analyzes pool state on each agent cycle and may override the configured strategy when conditions warrant caution.

## TypeScript

Full type declarations are included:

```ts
import { GlidePoolClient, Agent, Pool, AgentAction, Advice } from '@glide-pool/sdk';
```

## Requirements

- Node.js 18 or later (uses native `fetch`)
- A running GlidePool API server

## License

MIT
