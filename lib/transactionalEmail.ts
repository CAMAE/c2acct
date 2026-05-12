import { getCommercialFeatureFlags, cleanProviderEnv } from "@/lib/commercialFlags";
import { formatMembershipValue } from "@/lib/membershipContent";
import type { MembershipAudience } from "@/lib/membershipContext";

type TransactionalEmailResult = {
  ok: boolean;
  staged: boolean;
  provider: "resend" | "postmark" | "staged";
  message: string;
};

function getTransactionalEmailConfiguration() {
  const flags = getCommercialFeatureFlags();
  const resendApiKey = cleanProviderEnv(process.env.PAT_RESEND_API_KEY) ?? cleanProviderEnv(process.env.RESEND_API_KEY);
  const postmarkServerToken =
    cleanProviderEnv(process.env.PAT_POSTMARK_SERVER_TOKEN) ?? cleanProviderEnv(process.env.POSTMARK_SERVER_TOKEN);

  return {
    enabled: flags.emailSendingEnabled && Boolean(resendApiKey || postmarkServerToken),
    from:
      cleanProviderEnv(process.env.PAT_TRANSACTIONAL_EMAIL_FROM) ??
      cleanProviderEnv(process.env.RESEND_FROM_EMAIL) ??
      "PAT <no-reply@pat.local>",
    resendApiKey,
    postmarkServerToken,
  };
}

async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<TransactionalEmailResult> {
  const config = getTransactionalEmailConfiguration();
  if (!config.enabled) {
    return {
      ok: true,
      staged: true,
      provider: "staged",
      message: "Transactional email is staged in this environment.",
    };
  }

  try {
    if (config.resendApiKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: config.from,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
        cache: "no-store",
      });

      return { ok: true, staged: false, provider: "resend", message: "Sent with Resend." };
    }

    if (config.postmarkServerToken) {
      await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Postmark-Server-Token": config.postmarkServerToken,
        },
        body: JSON.stringify({
          From: config.from,
          To: input.to,
          Subject: input.subject,
          HtmlBody: input.html,
          TextBody: input.text,
        }),
        cache: "no-store",
      });

      return { ok: true, staged: false, provider: "postmark", message: "Sent with Postmark." };
    }
  } catch (error) {
    return {
      ok: false,
      staged: false,
      provider: config.resendApiKey ? "resend" : "postmark",
      message: error instanceof Error ? error.message : "Email send failed.",
    };
  }

  return {
    ok: true,
    staged: true,
    provider: "staged",
    message: "Transactional email provider is staged.",
  };
}

export async function sendFirmUserInviteEmail(input: {
  toEmail: string;
  recipientName: string;
  firmName: string;
  role: string;
  title: string;
  onboardingNote?: string | null;
}) {
  const subject = `${input.firmName} PAT access invitation`;
  const text = [
    `Hello ${input.recipientName},`,
    `You have been added to PAT access for ${input.firmName}.`,
    `Role: ${input.role}`,
    `Title: ${input.title}`,
    input.onboardingNote ? `Onboarding note: ${input.onboardingNote}` : null,
    "If local review auth is enabled, use the PAT sign-in route configured for your environment.",
  ]
    .filter(Boolean)
    .join("\n");

  return sendTransactionalEmail({
    to: input.toEmail,
    subject,
    text,
    html: `<p>Hello ${input.recipientName},</p><p>You have been added to PAT access for <strong>${input.firmName}</strong>.</p><p><strong>Role:</strong> ${input.role}<br /><strong>Title:</strong> ${input.title}</p>${input.onboardingNote ? `<p><strong>Onboarding note:</strong> ${input.onboardingNote}</p>` : ""}<p>If local review auth is enabled, use the PAT sign-in route configured for your environment.</p>`,
  });
}

export async function sendMembershipUpgradeConfirmationEmail(input: {
  toEmail: string;
  audience: MembershipAudience;
  plan: string;
  displayName: string;
}) {
  const tier = formatMembershipValue(input.plan);
  return sendTransactionalEmail({
    to: input.toEmail,
    subject: `${formatMembershipValue(input.audience)} PAT ${tier} membership confirmed`,
    text: `PAT confirmed the ${tier} membership state for ${input.displayName}. Final subscription truth came from provider-backed reconciliation.`,
    html: `<p>PAT confirmed the <strong>${tier}</strong> membership state for <strong>${input.displayName}</strong>.</p><p>Final subscription truth came from provider-backed reconciliation.</p>`,
  });
}

export async function sendPaymentFailureNotificationEmail(input: {
  toEmail: string;
  audience: MembershipAudience;
  plan: string;
  displayName: string;
}) {
  const tier = formatMembershipValue(input.plan);
  return sendTransactionalEmail({
    to: input.toEmail,
    subject: `${formatMembershipValue(input.audience)} PAT payment issue`,
    text: `PAT marked the ${tier} membership for ${input.displayName} as past due based on provider payment failure telemetry.`,
    html: `<p>PAT marked the <strong>${tier}</strong> membership for <strong>${input.displayName}</strong> as past due based on provider payment failure telemetry.</p>`,
  });
}
