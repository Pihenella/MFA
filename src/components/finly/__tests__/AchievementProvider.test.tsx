import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AchievementProvider, useAchievement } from "@/hooks/useAchievement";
import type { Doc } from "../../../../convex/_generated/dataModel";

const markSeenMock = vi.fn();
const useQueryMock = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: () => markSeenMock,
  useQuery: () => useQueryMock(),
}));

function achievement(
  id: string,
  kind: Doc<"userAchievements">["kind"],
): Doc<"userAchievements"> {
  return {
    _id: id as Doc<"userAchievements">["_id"],
    _creationTime: 1,
    userId: "user-1" as Doc<"userAchievements">["userId"],
    kind,
    achievedAt: 1_777_360_000_000,
  };
}

function renderProvider() {
  render(
    <AchievementProvider>
      <div>Рабочий экран</div>
    </AchievementProvider>,
  );
}

describe("AchievementProvider", () => {
  beforeEach(() => {
    markSeenMock.mockReset();
    markSeenMock.mockResolvedValue(undefined);
    useQueryMock.mockReset();
  });

  it("renders subscribed achievements and marks displayed items as seen", async () => {
    const item = achievement("achievement-1", "firstShop");
    useQueryMock.mockReturnValue([item]);

    renderProvider();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Первый магазин!",
    );
    await waitFor(() =>
      expect(markSeenMock).toHaveBeenCalledWith({
        achievementId: item._id,
      }),
    );
  });

  it("keeps at most three achievement toasts visible", async () => {
    useQueryMock.mockReturnValue([
      achievement("achievement-1", "firstShop"),
      achievement("achievement-2", "firstThousandSales"),
      achievement("achievement-3", "monthlyPlanHit"),
      achievement("achievement-4", "firstMillionProfit"),
    ]);

    renderProvider();

    expect(await screen.findByText("Первый магазин!")).toBeInTheDocument();
    expect(screen.getAllByRole("alert")).toHaveLength(3);
    expect(markSeenMock).toHaveBeenCalledTimes(3);
    expect(screen.queryByText("Первый миллион прибыли!")).not.toBeInTheDocument();
  });

  it("allows manual toasts through useAchievement().show", async () => {
    useQueryMock.mockReturnValue([]);

    function Probe() {
      const { show } = useAchievement();
      return (
        <button
          type="button"
          onClick={() =>
            show({
              kind: "manual",
              title: "Ручная отметка",
              body: "Проверяем очередь тостов.",
            })
          }
        >
          показать
        </button>
      );
    }

    render(
      <AchievementProvider>
        <Probe />
      </AchievementProvider>,
    );

    fireEvent.click(screen.getByText("показать"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ручная отметка",
    );
    expect(markSeenMock).not.toHaveBeenCalled();
  });
});
