export const ELEVATED_CONFIRMATION_FIELD = "elevatedConfirmation";

export const ELEVATED_ACTION = {
  MEMBERSHIP_CHECKOUT: "membership_checkout",
  BILLING_PORTAL: "billing_portal",
} as const;

export type ElevatedAction = (typeof ELEVATED_ACTION)[keyof typeof ELEVATED_ACTION];

export function hasElevatedConfirmation(formData: FormData, action: ElevatedAction) {
  return formData.get(ELEVATED_CONFIRMATION_FIELD) === action;
}
