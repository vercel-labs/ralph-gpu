import type { GenerateTextResult, ToolSet, StepResult } from 'ai';
import type { LanguageModelUsage } from 'ai';

/**
 * Context passed to stop condition functions.
 */
export type RalphStopConditionContext<TOOLS extends ToolSet = {}> = {
  /**
   * Current iteration number (1-indexed).
   */
  iteration: number;

  /**
   * All results from completed iterations.
   */
  allResults: Array<GenerateTextResult<TOOLS, never>>;

  /**
   * Aggregated token usage across all iterations.
   */
  totalUsage: LanguageModelUsage;

  /**
   * The model identifier (e.g., 'anthropic/claude-opus-4.5').
   */
  model: string;
};

/**
 * A function that determines when to stop the Ralph loop.
 * Return true to stop, false to continue.
 */
export type RalphStopCondition<TOOLS extends ToolSet = {}> = (
  context: RalphStopConditionContext<TOOLS>
) => PromiseLike<boolean> | boolean;

/**
 * Cost rates per million tokens.
 */
export type CostRates = {
  inputCostPerMillionTokens: number;
  outputCostPerMillionTokens: number;
  cacheReadCostPerMillionTokens?: number;
  cacheWriteCostPerMillionTokens?: number;
};

/**
 * Pricing for common models (cost per million tokens in USD).
 */
const MODEL_PRICING: Record<string, CostRates> = {
  // Anthropic - Haiku models
  'anthropic/claude-3-haiku': { 
    inputCostPerMillionTokens: 0.25, 
    outputCostPerMillionTokens: 1.25,
    cacheReadCostPerMillionTokens: 0.03,
    cacheWriteCostPerMillionTokens: 0.30,
  },
  'anthropic/claude-3.5-haiku': { 
    inputCostPerMillionTokens: 0.80, 
    outputCostPerMillionTokens: 4.00,
    cacheReadCostPerMillionTokens: 0.08,
    cacheWriteCostPerMillionTokens: 1.00,
  },
  'anthropic/claude-haiku-4.5': { 
    inputCostPerMillionTokens: 1.00, 
    outputCostPerMillionTokens: 5.00,
    cacheReadCostPerMillionTokens: 0.10,
    cacheWriteCostPerMillionTokens: 1.25,
  },
  // Anthropic - Sonnet models
  'anthropic/claude-sonnet-4.5': { 
    inputCostPerMillionTokens: 3.0, 
    outputCostPerMillionTokens: 15.0,
    cacheReadCostPerMillionTokens: 0.30,
    cacheWriteCostPerMillionTokens: 3.75,
  },
  'anthropic/claude-3.7-sonnet': { 
    inputCostPerMillionTokens: 3.0, 
    outputCostPerMillionTokens: 15.0,
    cacheReadCostPerMillionTokens: 0.30,
    cacheWriteCostPerMillionTokens: 3.75,
  },
  'anthropic/claude-sonnet-4': { 
    inputCostPerMillionTokens: 3.0, 
    outputCostPerMillionTokens: 15.0,
    cacheReadCostPerMillionTokens: 0.30,
    cacheWriteCostPerMillionTokens: 3.75,
  },
  'anthropic/claude-3.5-sonnet': { 
    inputCostPerMillionTokens: 3.0, 
    outputCostPerMillionTokens: 15.0,
    cacheReadCostPerMillionTokens: 0.30,
    cacheWriteCostPerMillionTokens: 3.75,
  },
  'anthropic/claude-3.5-sonnet-20241022': { 
    inputCostPerMillionTokens: 3.0, 
    outputCostPerMillionTokens: 15.0,
    // No caching for this model
  },
  // Anthropic - Opus models
  'anthropic/claude-opus-4.5': { 
    inputCostPerMillionTokens: 5.0, 
    outputCostPerMillionTokens: 25.0,
    cacheReadCostPerMillionTokens: 0.50,
    cacheWriteCostPerMillionTokens: 6.25,
  },
  'anthropic/claude-opus-4.1': { 
    inputCostPerMillionTokens: 15.0, 
    outputCostPerMillionTokens: 75.0,
    cacheReadCostPerMillionTokens: 1.50,
    cacheWriteCostPerMillionTokens: 18.75,
  },
  'anthropic/claude-opus-4': { 
    inputCostPerMillionTokens: 15.0, 
    outputCostPerMillionTokens: 75.0,
    cacheReadCostPerMillionTokens: 1.50,
    cacheWriteCostPerMillionTokens: 18.75,
  },
  'anthropic/claude-3-opus': { 
    inputCostPerMillionTokens: 15.0, 
    outputCostPerMillionTokens: 75.0,
    // No caching for this model
  },
  // OpenAI
  'openai/gpt-4o': { inputCostPerMillionTokens: 2.5, outputCostPerMillionTokens: 10.0 },
  'openai/gpt-4o-mini': { inputCostPerMillionTokens: 0.15, outputCostPerMillionTokens: 0.6 },
  'openai/gpt-4-turbo': { inputCostPerMillionTokens: 10.0, outputCostPerMillionTokens: 30.0 },
  'openai/o1': { inputCostPerMillionTokens: 15.0, outputCostPerMillionTokens: 60.0 },
  'openai/o1-mini': { inputCostPerMillionTokens: 1.1, outputCostPerMillionTokens: 4.4 },
  'openai/o3-mini': { inputCostPerMillionTokens: 1.1, outputCostPerMillionTokens: 4.4 },
  // Google
  'google/gemini-2.5-pro': { inputCostPerMillionTokens: 1.25, outputCostPerMillionTokens: 10.0 },
  'google/gemini-2.5-flash': { inputCostPerMillionTokens: 0.15, outputCostPerMillionTokens: 0.6 },
  'google/gemini-2.0-flash': { inputCostPerMillionTokens: 0.1, outputCostPerMillionTokens: 0.4 },
  // xAI
  'xai/grok-3': { inputCostPerMillionTokens: 3.0, outputCostPerMillionTokens: 15.0 },
  'xai/grok-3-mini': { inputCostPerMillionTokens: 0.3, outputCostPerMillionTokens: 0.5 },
  // DeepSeek
  'deepseek/deepseek-chat': { inputCostPerMillionTokens: 0.14, outputCostPerMillionTokens: 0.28 },
  'deepseek/deepseek-reasoner': { inputCostPerMillionTokens: 0.55, outputCostPerMillionTokens: 2.19 },
};

/**
 * Get pricing for a model.
 */
export function getModelPricing(model: string): CostRates | undefined {
  return MODEL_PRICING[model];
}

/**
 * Helper to add two token counts (handles undefined).
 */
function addTokenCounts(
  a: number | undefined,
  b: number | undefined
): number | undefined {
  if (a == null && b == null) return undefined;
  return (a ?? 0) + (b ?? 0);
}

/**
 * Add two usage objects together.
 */
export function addLanguageModelUsage(
  usage1: LanguageModelUsage,
  usage2: LanguageModelUsage
): LanguageModelUsage {
  return {
    inputTokens: addTokenCounts(usage1.inputTokens, usage2.inputTokens),
    inputTokenDetails: {
      noCacheTokens: addTokenCounts(
        usage1.inputTokenDetails?.noCacheTokens,
        usage2.inputTokenDetails?.noCacheTokens
      ),
      cacheReadTokens: addTokenCounts(
        usage1.inputTokenDetails?.cacheReadTokens,
        usage2.inputTokenDetails?.cacheReadTokens
      ),
      cacheWriteTokens: addTokenCounts(
        usage1.inputTokenDetails?.cacheWriteTokens,
        usage2.inputTokenDetails?.cacheWriteTokens
      ),
    },
    outputTokens: addTokenCounts(usage1.outputTokens, usage2.outputTokens),
    outputTokenDetails: {
      textTokens: addTokenCounts(
        usage1.outputTokenDetails?.textTokens,
        usage2.outputTokenDetails?.textTokens
      ),
      reasoningTokens: addTokenCounts(
        usage1.outputTokenDetails?.reasoningTokens,
        usage2.outputTokenDetails?.reasoningTokens
      ),
    },
    totalTokens: addTokenCounts(usage1.totalTokens, usage2.totalTokens),
  };
}

/**
 * Aggregate usage from all steps in a generateText result.
 * This provides more accurate token counts than result.usage alone,
 * which may not include all tool call tokens.
 */
export function aggregateStepUsage<TOOLS extends ToolSet>(
  result: GenerateTextResult<TOOLS, never>
): LanguageModelUsage {
  // Start with zero usage
  let aggregated: LanguageModelUsage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    inputTokenDetails: {
      noCacheTokens: undefined,
      cacheReadTokens: undefined,
      cacheWriteTokens: undefined,
    },
    outputTokenDetails: {
      textTokens: undefined,
      reasoningTokens: undefined,
    },
  };

  // Sum up usage from each step
  for (const step of result.steps) {
    if (step.usage) {
      aggregated = addLanguageModelUsage(aggregated, step.usage);
    }
  }

  // Compare with result.usage and use the higher values for main counts
  // Keep aggregated cache details since result.usage often doesn't have them
  const resultUsage = result.usage;
  return {
    inputTokens: Math.max(aggregated.inputTokens ?? 0, resultUsage.inputTokens ?? 0),
    outputTokens: Math.max(aggregated.outputTokens ?? 0, resultUsage.outputTokens ?? 0),
    totalTokens: Math.max(aggregated.totalTokens ?? 0, resultUsage.totalTokens ?? 0),
    inputTokenDetails: {
      noCacheTokens: aggregated.inputTokenDetails?.noCacheTokens,
      cacheReadTokens: aggregated.inputTokenDetails?.cacheReadTokens,
      cacheWriteTokens: aggregated.inputTokenDetails?.cacheWriteTokens,
    },
    outputTokenDetails: aggregated.outputTokenDetails,
  };
}

/**
 * Calculate cost from usage and rates.
 * Accounts for prompt caching if cache token details are available.
 */
export function calculateCost(usage: LanguageModelUsage, rates: CostRates): number {
  const outputTokens = usage.outputTokens ?? 0;
  const cacheReadTokens = usage.inputTokenDetails?.cacheReadTokens ?? 0;
  const cacheWriteTokens = usage.inputTokenDetails?.cacheWriteTokens ?? 0;
  
  // Calculate input cost with cache awareness
  let inputCost: number;
  if (cacheReadTokens > 0 || cacheWriteTokens > 0) {
    // Cache is being used - calculate with cache rates
    const uncachedInputTokens = (usage.inputTokens ?? 0) - cacheReadTokens - cacheWriteTokens;
    const cacheReadRate = rates.cacheReadCostPerMillionTokens ?? rates.inputCostPerMillionTokens;
    const cacheWriteRate = rates.cacheWriteCostPerMillionTokens ?? rates.inputCostPerMillionTokens;
    
    inputCost = 
      (uncachedInputTokens / 1_000_000) * rates.inputCostPerMillionTokens +
      (cacheReadTokens / 1_000_000) * cacheReadRate +
      (cacheWriteTokens / 1_000_000) * cacheWriteRate;
  } else {
    // No cache info - use standard input rate
    inputCost = ((usage.inputTokens ?? 0) / 1_000_000) * rates.inputCostPerMillionTokens;
  }
  
  const outputCost = (outputTokens / 1_000_000) * rates.outputCostPerMillionTokens;
  
  return inputCost + outputCost;
}

/**
 * Stop when iteration count reaches the specified number.
 *
 * @example
 * ```ts
 * stopWhen: iterationCountIs(50)
 * ```
 */
export function iterationCountIs(count: number): RalphStopCondition<any> {
  return ({ iteration }) => iteration >= count;
}

/**
 * Stop when total token count reaches the specified number.
 *
 * @example
 * ```ts
 * stopWhen: tokenCountIs(100_000)
 * ```
 */
export function tokenCountIs(maxTokens: number): RalphStopCondition<any> {
  return ({ totalUsage }) => (totalUsage.totalTokens ?? 0) >= maxTokens;
}

/**
 * Stop when input token count reaches the specified number.
 *
 * @example
 * ```ts
 * stopWhen: inputTokenCountIs(50_000)
 * ```
 */
export function inputTokenCountIs(maxTokens: number): RalphStopCondition<any> {
  return ({ totalUsage }) => (totalUsage.inputTokens ?? 0) >= maxTokens;
}

/**
 * Stop when output token count reaches the specified number.
 *
 * @example
 * ```ts
 * stopWhen: outputTokenCountIs(50_000)
 * ```
 */
export function outputTokenCountIs(maxTokens: number): RalphStopCondition<any> {
  return ({ totalUsage }) => (totalUsage.outputTokens ?? 0) >= maxTokens;
}

/**
 * Stop when cost reaches the specified amount in USD.
 *
 * Can infer pricing from the model, use an explicit model, or provide custom rates.
 *
 * @example
 * ```ts
 * // Infer from agent's model
 * stopWhen: costIs(2.00)
 *
 * // Explicit model
 * stopWhen: costIs(2.00, 'anthropic/claude-sonnet-4')
 *
 * // Custom rates
 * stopWhen: costIs(2.00, {
 *   inputCostPerMillionTokens: 3.00,
 *   outputCostPerMillionTokens: 15.00
 * })
 * ```
 */
export function costIs(
  maxCostDollars: number,
  ratesOrModel?: CostRates | string
): RalphStopCondition<any> {
  return ({ totalUsage, model }) => {
    let rates: CostRates;

    if (typeof ratesOrModel === 'object') {
      // Explicit rates provided
      rates = ratesOrModel;
    } else {
      // Look up model pricing
      const modelToUse = typeof ratesOrModel === 'string' ? ratesOrModel : model;
      const pricing = getModelPricing(modelToUse);

      if (!pricing) {
        throw new Error(
          `Unknown model "${modelToUse}". Provide explicit rates:\n` +
            `costIs(${maxCostDollars}, { inputCostPerMillionTokens: X, outputCostPerMillionTokens: Y })`
        );
      }

      rates = pricing;
    }

    const currentCost = calculateCost(totalUsage, rates);
    return currentCost >= maxCostDollars;
  };
}

/**
 * Check if any stop condition is met.
 */
export async function isRalphStopConditionMet<TOOLS extends ToolSet>({
  stopConditions,
  context,
}: {
  stopConditions: Array<RalphStopCondition<TOOLS>>;
  context: RalphStopConditionContext<TOOLS>;
}): Promise<boolean> {
  const results = await Promise.all(
    stopConditions.map((condition) => condition(context))
  );
  return results.some((result) => result);
}

