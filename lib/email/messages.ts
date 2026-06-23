function layout(title: string, bodyHtml: string): string {
  return `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <h1 style="font-size:18px;margin:0 0 16px">${title}</h1>
  ${bodyHtml}
  <p style="color:#888;font-size:12px;margin-top:24px">If you didn't expect this email, you can safely ignore it.</p>
</div>`;
}

function button(href: string, label: string): string {
  return `<p><a href="${href}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px">${label}</a></p>`;
}

export function passwordResetEmail(resetUrl: string): { subject: string; html: string } {
  return {
    subject: "Reset your password",
    html: layout(
      "Reset your password",
      `<p>Use the button below to choose a new password. This link expires in one hour.</p>${button(resetUrl, "Reset password")}`,
    ),
  };
}

export function workspaceInviteEmail(
  inviteUrl: string,
  workspaceName: string,
): { subject: string; html: string } {
  return {
    subject: `You've been invited to ${workspaceName}`,
    html: layout(
      `Join ${workspaceName}`,
      `<p>You've been invited to collaborate on <strong>${workspaceName}</strong>. This invite expires in 7 days.</p>${button(inviteUrl, "Accept invite")}`,
    ),
  };
}
