export interface Pool {
  poolAddress: string;
  tokenASymbol: string;
  tokenBSymbol: string;
  tokenAAddress: string;
  tokenBAddress: string;
  tvlUsd: number;
  currentPrice: number;
  activeTick: number;
  feeRate: number;
  tickSpacing: number;
}

export interface CreateAgentParams {
  userAddress: string;
  poolAddress: string;
  strategy: 'conservative' | 'balanced' | 'aggressive';
  budgetUsdc: number;
  analysisIntervalSec?: number;
}

export interface Agent {
  id: string;
  userAddress: string;
  poolAddress: string;
  strategy: string;
  budgetUsdc: string;
  status: 'active' | 'paused' | 'stopped';
  lastAnalysisAt: string | null;
  createdAt: string;
}

export interface AgentAction {
  id: string;
  agentId: string;
  actionType: 'hold' | 'rebalance' | 'withdraw' | 'add_liquidity' | 'switch_mode';
  status: 'pending_signature' | 'completed' | 'signed' | 'failed';
  llmReasoning: string | null;
  llmRecommendation: Record<string, unknown> | null;
  txHash: string | null;
  createdAt: string;
}

export interface Position {
  nftId: string;
  poolAddress: string;
  tokenASymbol: string;
  tokenBSymbol: string;
  valueUsd: number;
  amountA: string;
  amountB: string;
  binCount: number;
}

export interface BinRange {
  lowerTick: number;
  upperTick: number;
}

export interface Recommendation {
  action: 'hold' | 'rebalance' | 'withdraw' | 'add_liquidity' | 'switch_mode';
  reasoning: string;
  suggestedMode?: string;
  suggestedBinRange?: BinRange;
  suggestedWithdrawPercent?: number;
}

export interface Advice {
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: Recommendation;
}

export interface AdvisorParams {
  poolAddress: string;
  userGoal: string;
  nftId?: string;
  paymentProof?: string;
}

export interface RemoveLiquidityParams {
  nftId: string;
  userAddress: string;
  poolAddress: string;
  withdrawPercent: number;
}

export interface RemoveLiquidityResult {
  poolAddress: string;
  nftId: string;
  binIds: number[];
  amounts: string[];
  estimatedTokenA: string;
  estimatedTokenB: string;
}

export interface AddLiquidityParams {
  poolAddress: string;
  userAddress: string;
  amountADesired: number;
  amountBDesired: number;
  mode: 'static' | 'both' | 'right' | 'left';
  lowerTick?: number;
  upperTick?: number;
}

export interface AddLiquidityResult {
  poolAddress: string;
  calldata: string;
  estimatedTokenA: string;
  estimatedTokenB: string;
}

export interface GlidePoolClientOptions {
  apiUrl: string;
}

export class GlidePoolClient {
  constructor(options: GlidePoolClientOptions);

  // Pools
  listPools(): Promise<Pool[]>;
  getPool(poolAddress: string): Promise<Pool>;

  // Agents
  createAgent(params: CreateAgentParams): Promise<Agent>;
  listAgents(userAddress: string): Promise<Agent[]>;
  getAgent(agentId: string): Promise<Agent>;
  updateAgentStatus(agentId: string, status: 'active' | 'paused' | 'stopped'): Promise<Agent>;
  pauseAgent(agentId: string): Promise<Agent>;
  resumeAgent(agentId: string): Promise<Agent>;
  stopAgent(agentId: string): Promise<Agent>;
  getAgentActions(agentId: string, limit?: number): Promise<AgentAction[]>;
  confirmAgentAction(agentId: string, actionId: string, txHash: string): Promise<void>;

  // Positions
  getUserPositions(walletAddress: string): Promise<Position[]>;

  // Advisor
  getAdvice(params: AdvisorParams): Promise<Advice>;

  // Liquidity
  getRemoveParams(params: RemoveLiquidityParams): Promise<RemoveLiquidityResult>;
  getAddParams(params: AddLiquidityParams): Promise<AddLiquidityResult>;
}
