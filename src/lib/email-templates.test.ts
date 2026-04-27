import { describe, it, expect } from "vitest";
import {
  renderVerifyEmail,
  renderApprovedEmail,
  renderRejectedEmail,
  renderResetPasswordEmail,
  renderTeamInviteEmail,
  renderInviteAcceptedEmail,
} from "./email-templates";

describe("renderVerifyEmail", () => {
  it("содержит имя, ссылку и срок 24ч", () => {
    const r = renderVerifyEmail({
      name: "Юрий",
      verifyUrl: "https://x/verify?t=abc",
    });
    expect(r.subject).toContain("Подтверждение");
    expect(r.html).toContain("Юрий");
    expect(r.html).toContain("https://x/verify?t=abc");
    expect(r.html).toContain("24");
    expect(r.text).toContain("https://x/verify?t=abc");
  });
  it("экранирует имя со скриптом", () => {
    const r = renderVerifyEmail({ name: "<script>", verifyUrl: "https://x" });
    expect(r.html).toContain("&lt;script&gt;");
    expect(r.html).not.toContain("<script>alert");
  });
});

describe("renderApprovedEmail", () => {
  it("содержит имя и login URL", () => {
    const r = renderApprovedEmail({ name: "Юрий", loginUrl: "https://x/login" });
    expect(r.html).toContain("Юрий");
    expect(r.html).toContain("https://x/login");
    expect(r.subject).toMatch(/одобрен|подтвержд/i);
  });
});

describe("renderRejectedEmail", () => {
  it("содержит причину если передана", () => {
    const r = renderRejectedEmail({
      name: "Юрий",
      reason: "Дубликат",
      supportContact: "@Virtuozick",
    });
    expect(r.html).toContain("Дубликат");
    expect(r.html).toContain("@Virtuozick");
  });
  it("работает без причины", () => {
    const r = renderRejectedEmail({
      name: "Юрий",
      supportContact: "@Virtuozick",
    });
    expect(r.html).toContain("Юрий");
  });
});

describe("renderResetPasswordEmail", () => {
  it("содержит ссылку и срок 1ч", () => {
    const r = renderResetPasswordEmail({
      name: "Юрий",
      resetUrl: "https://x/reset?t=abc",
    });
    expect(r.html).toContain("https://x/reset?t=abc");
    expect(r.html).toContain("1");
  });
});

describe("renderTeamInviteEmail", () => {
  it("содержит имя приглашающего, org и accept URL", () => {
    const r = renderTeamInviteEmail({
      inviterName: "Юрий",
      orgName: "AID",
      acceptUrl: "https://x/invite/abc",
    });
    expect(r.html).toContain("Юрий");
    expect(r.html).toContain("AID");
    expect(r.html).toContain("https://x/invite/abc");
    expect(r.html).toContain("3");
  });
});

describe("renderInviteAcceptedEmail", () => {
  it("содержит имя owner, invitee и org", () => {
    const r = renderInviteAcceptedEmail({
      ownerName: "Юрий",
      inviteeName: "Алексей",
      orgName: "AID",
    });
    expect(r.html).toContain("Юрий");
    expect(r.html).toContain("Алексей");
    expect(r.html).toContain("AID");
  });
});
