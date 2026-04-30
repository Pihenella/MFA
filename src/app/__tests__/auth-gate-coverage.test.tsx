import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Mock useCurrentUser hook
const useCurrentUserMock = vi.fn();
vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => useCurrentUserMock(),
}));

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/test",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock convex hooks used inside content components
vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => undefined),
  useConvexAuth: vi.fn(() => ({ isLoading: true, isAuthenticated: false })),
  useMutation: vi.fn(() => vi.fn()),
  useAction: vi.fn(() => vi.fn()),
}));

const PAGES = [
  { name: "pulse",         load: () => import("@/app/pulse/page") },
  { name: "analytics",     load: () => import("@/app/analytics/page") },
  { name: "products",      load: () => import("@/app/products/page") },
  { name: "financials",    load: () => import("@/app/financials/page") },
  { name: "feedbacks",     load: () => import("@/app/feedbacks/page") },
  { name: "returns",       load: () => import("@/app/returns/page") },
  { name: "prices",        load: () => import("@/app/prices/page") },
  { name: "settings",      load: () => import("@/app/settings/page") },
  { name: "org/team",      load: () => import("@/app/org/team/page") },
  { name: "org/settings",  load: () => import("@/app/org/settings/page") },
  { name: "admin/users",   load: () => import("@/app/admin/users/page") },
];

describe.each(PAGES)("AuthGate coverage: $name", ({ name, load }) => {
  beforeEach(() => {
    useCurrentUserMock.mockReset();
    replaceMock.mockReset();
  });

  it(`${name}: undefined user shows loader, no crash`, async () => {
    useCurrentUserMock.mockReturnValue(undefined);
    const Page = (await load()).default;
    render(<Page />);
    expect(screen.getByText(/загрузка/i)).toBeInTheDocument();
  });

  it(`${name}: pending user redirects to /pending-approval`, async () => {
    useCurrentUserMock.mockReturnValue({ _id: "u1", status: "pending" });
    const Page = (await load()).default;
    render(<Page />);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/pending-approval"));
  });

  it(`${name}: null user redirects to /login`, async () => {
    useCurrentUserMock.mockReturnValue(null);
    const Page = (await load()).default;
    render(<Page />);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
  });
});
