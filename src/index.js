/**
 * @glide-pool/sdk
 * JavaScript SDK for the GlidePool autonomous DLMM agent API on Base Mainnet.
 *
 * @example
 * import { GlidePoolClient } from '@glide-pool/sdk';
 * const client = new GlidePoolClient({ apiUrl: 'https://your-glidepool-instance.com' });
 * const pools = await client.listPools();
 */

export class GlidePoolClient {
  /**
   * @param {object} options
   * @param {string} options.apiUrl - Base URL of your GlidePool API server (no trailing slash)
   */
  constructor({ apiUrl } = {}) {
    if (!apiUrl) throw new Error('GlidePoolClient requires { apiUrl } — e.g. https://api.glidepool.xyz');
    this.apiUrl = apiUrl.replace(/\/$/, '');
  }

  /**
   * Internal fetch helper. Throws on non-2xx responses.
   * @private
   */
  async _fetch(path, options = {}) {
    const url = `${this.apiUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || data.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  // ─────────────────────────────────────────
  // POOLS
  // ─────────────────────────────────────────

  /**
   * List all supported Maverick V2 pools with live TVL, price, and fee rate.
   * @returns {Promise<Pool[]>}
   */
  listPools() {
    return this._fetch('/api/pools');
  }

  /**
   * Get details for a specific pool by address.
   * @param {string} poolAddress - Maverick V2 pool contract address (0x...)
   * @returns {Promise<Pool>}
   */
  getPool(poolAddress) {
    return this._fetch(`/api/pools/${poolAddress}`);
  }

  // ─────────────────────────────────────────
  // AGENTS
  // ─────────────────────────────────────────

  /**
   * Create a new autonomous agent for a given wallet + pool.
   * The agent loop starts immediately on the server — no additional setup needed.
   *
   * @param {CreateAgentParams} params
   * @returns {Promise<Agent>}
   *
   * @example
   * const agent = await client.createAgent({
   *   userAddress: '0xYourWallet',
   *   poolAddress: '0x3d70b2f31f75dc84acdd5e1588695221959b2d37',
   *   strategy: 'balanced',
   *   budgetUsdc: 100,
   *   analysisIntervalSec: 60,
   * });
   */
  createAgent(params) {
    return this._fetch('/api/agents', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * List all agents for a wallet address.
   * @param {string} userAddress - Wallet address (0x...)
   * @returns {Promise<Agent[]>}
   */
  listAgents(userAddress) {
    return this._fetch(`/api/agents?userAddress=${encodeURIComponent(userAddress)}`);
  }

  /**
   * Get a single agent by ID, including recent actions.
   * @param {string} agentId - UUID of the agent
   * @returns {Promise<Agent>}
   */
  getAgent(agentId) {
    return this._fetch(`/api/agents/${agentId}`);
  }

  /**
   * Update agent status.
   * @param {string} agentId
   * @param {'active'|'paused'|'stopped'} status
   * @returns {Promise<Agent>}
   */
  updateAgentStatus(agentId, status) {
    return this._fetch(`/api/agents/${agentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  /**
   * Pause a running agent. Analysis loop stops until resumed.
   * @param {string} agentId
   */
  pauseAgent(agentId) { return this.updateAgentStatus(agentId, 'paused'); }

  /**
   * Resume a paused agent.
   * @param {string} agentId
   */
  resumeAgent(agentId) { return this.updateAgentStatus(agentId, 'active'); }

  /**
   * Stop an agent permanently.
   * @param {string} agentId
   */
  stopAgent(agentId) { return this.updateAgentStatus(agentId, 'stopped'); }

  /**
   * Get LLM decisions (actions) for an agent.
   * @param {string} agentId
   * @param {number} [limit=20]
   * @returns {Promise<AgentAction[]>}
   */
  getAgentActions(agentId, limit = 20) {
    return this._fetch(`/api/agents/${agentId}/actions?limit=${limit}`);
  }

  /**
   * Confirm an on-chain action was signed and executed.
   * @param {string} agentId
   * @param {string} actionId
   * @param {string} txHash - Transaction hash (0x...)
   */
  confirmAgentAction(agentId, actionId, txHash) {
    return this._fetch(`/api/agents/${agentId}/actions/${actionId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ txHash }),
    });
  }

  // ─────────────────────────────────────────
  // POSITIONS
  // ─────────────────────────────────────────

  /**
   * Get all Maverick V2 LP positions for a wallet on Base Mainnet.
   * @param {string} walletAddress
   * @returns {Promise<Position[]>}
   */
  getUserPositions(walletAddress) {
    return this._fetch(`/api/positions/${walletAddress}`);
  }

  // ─────────────────────────────────────────
  // ADVISOR (x402 gated)
  // ─────────────────────────────────────────

  /**
   * Get a Claude Opus 4 recommendation for a pool + optional existing position.
   * If x402 is enabled on the server, you must provide a valid paymentProof header.
   * Otherwise, queries run freely.
   *
   * @param {AdvisorParams} params
   * @returns {Promise<Advice>}
   *
   * @example
   * const advice = await client.getAdvice({
   *   poolAddress: '0x3d70...',
   *   userGoal: 'maximize fee income with low IL risk',
   * });
   */
  getAdvice({ poolAddress, nftId, userGoal, paymentProof } = {}) {
    const qs = new URLSearchParams({ poolAddress, userGoal });
    if (nftId) qs.set('nftId', nftId);
    const headers = {};
    if (paymentProof) headers['x-payment-proof'] = paymentProof;
    return this._fetch(`/api/advisor?${qs}`, { headers });
  }

  // ─────────────────────────────────────────
  // LIQUIDITY
  // ─────────────────────────────────────────

  /**
   * Compute remove-liquidity calldata for a position.
   * Returns estimated token amounts and bin IDs. You sign the transaction in your wallet.
   * @param {RemoveLiquidityParams} params
   * @returns {Promise<RemoveLiquidityResult>}
   */
  getRemoveParams(params) {
    return this._fetch('/api/liquidity/remove-params', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Compute add-liquidity calldata for a pool.
   * Returns encoded calldata for the addLiquidity transaction. You sign in your wallet.
   * @param {AddLiquidityParams} params
   * @returns {Promise<AddLiquidityResult>}
   */
  getAddParams(params) {
    return this._fetch('/api/liquidity/add-params', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }
}

/**
 * @typedef {object} Pool
 * @property {string} poolAddress
 * @property {string} tokenASymbol
 * @property {string} tokenBSymbol
 * @property {string} tokenAAddress
 * @property {string} tokenBAddress
 * @property {number} tvlUsd
 * @property {number} currentPrice
 * @property {number} activeTick
 * @property {number} feeRate
 * @property {number} tickSpacing
 */

/**
 * @typedef {object} CreateAgentParams
 * @property {string} userAddress - Wallet address that owns this agent
 * @property {string} poolAddress - Maverick V2 pool address to monitor
 * @property {'conservative'|'balanced'|'aggressive'} strategy
 * @property {number} budgetUsdc - Max USDC budget for liquidity operations
 * @property {number} [analysisIntervalSec=60] - How often to run LLM analysis (min: 30s)
 */

/**
 * @typedef {object} Agent
 * @property {string} id
 * @property {string} userAddress
 * @property {string} poolAddress
 * @property {string} strategy
 * @property {string} budgetUsdc
 * @property {'active'|'paused'|'stopped'} status
 * @property {string|null} lastAnalysisAt
 * @property {string} createdAt
 */

/**
 * @typedef {object} AgentAction
 * @property {string} id
 * @property {string} agentId
 * @property {'hold'|'rebalance'|'withdraw'|'add_liquidity'|'switch_mode'} actionType
 * @property {'pending_signature'|'completed'|'signed'|'failed'} status
 * @property {string|null} llmReasoning
 * @property {object|null} llmRecommendation
 * @property {string|null} txHash
 * @property {string} createdAt
 */

/**
 * @typedef {object} Position
 * @property {string} nftId
 * @property {string} poolAddress
 * @property {string} tokenASymbol
 * @property {string} tokenBSymbol
 * @property {number} valueUsd
 * @property {string} amountA
 * @property {string} amountB
 * @property {number} binCount
 */

/**
 * @typedef {object} AdvisorParams
 * @property {string} poolAddress
 * @property {string} userGoal
 * @property {string} [nftId]
 * @property {string} [paymentProof] - base64(JSON{txHash,from,amount}) for x402
 */

/**
 * @typedef {object} Advice
 * @property {string} summary
 * @property {'low'|'medium'|'high'} riskLevel
 * @property {object} recommendation
 * @property {'hold'|'rebalance'|'withdraw'|'add_liquidity'|'switch_mode'} recommendation.action
 * @property {string} recommendation.reasoning
 * @property {object} [recommendation.suggestedBinRange]
 * @property {number} [recommendation.suggestedWithdrawPercent]
 */

/**
 * @typedef {object} RemoveLiquidityParams
 * @property {string} nftId
 * @property {string} userAddress
 * @property {string} poolAddress
 * @property {number} withdrawPercent - 0–100
 */

/**
 * @typedef {object} AddLiquidityParams
 * @property {string} poolAddress
 * @property {string} userAddress
 * @property {number} amountADesired
 * @property {number} amountBDesired
 * @property {'static'|'both'|'right'|'left'} mode
 * @property {number} [lowerTick]
 * @property {number} [upperTick]
 */
