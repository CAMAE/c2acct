export const PRODUCT_OBSERVED_SIGNAL_CARD_THRESHOLDS = [
  { cardId: "observed_market_signal_summary", thresholdUsed: 60 as const },
  { cardId: "observed_market_confidence", thresholdUsed: 75 as const },
  { cardId: "product_workflow_fit_snapshot", thresholdUsed: 60 as const },
  { cardId: "product_support_confidence_signal", thresholdUsed: 75 as const },
] as const;
