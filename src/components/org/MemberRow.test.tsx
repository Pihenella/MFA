import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemberRow } from "./MemberRow";

describe("MemberRow", () => {
  it("renders name and email", () => {
    const { getByText } = render(
      <MemberRow
        member={{
          membershipId: "m1" as never,
          userId: "u1" as never,
          email: "a@b.com",
          name: "Иван",
          role: "member",
          joinedAt: 0,
        }}
        canManage={true}
        isSelf={false}
        onRemove={() => {}}
        onMakeOwner={() => {}}
      />
    );
    expect(getByText("Иван")).toBeTruthy();
    expect(getByText(/a@b.com/)).toBeTruthy();
  });
});
