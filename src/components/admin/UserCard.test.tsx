import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { UserCard } from "./UserCard";

describe("UserCard", () => {
  const baseUser = {
    _id: "u1" as never,
    email: "test@example.com",
    name: "Тестовый Юзер",
    phone: "+71234567890",
    businessName: "ООО Тест",
    shopsCountWB: 2,
    shopsCountOzon: 1,
    skuCount: 50,
    status: "pending" as const,
    isSystemAdmin: false,
    emailVerifiedAt: null,
    rejectionReason: null,
    createdAt: 1700000000000,
    approvedAt: null,
    approvedBy: null,
  };

  it("renders user name and email", () => {
    const { getByText } = render(
      <UserCard
        user={baseUser as never}
        onApprove={() => {}}
        onReject={() => {}}
      />
    );
    expect(getByText("Тестовый Юзер")).toBeTruthy();
    expect(getByText(/test@example.com/)).toBeTruthy();
  });

  it("shows NOT VERIFIED badge when emailVerifiedAt is null", () => {
    const { getByText } = render(
      <UserCard
        user={baseUser as never}
        onApprove={() => {}}
        onReject={() => {}}
      />
    );
    expect(getByText(/NOT VERIFIED/i)).toBeTruthy();
  });
});
