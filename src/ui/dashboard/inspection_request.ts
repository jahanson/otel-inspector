import type { DashboardCard } from "./types.ts";

export type InspectionRequest = {
  actionId: number;
  target: NonNullable<DashboardCard["detailTarget"]>;
};

export function nextInspectionRequest(
  current: InspectionRequest | undefined,
  target: NonNullable<DashboardCard["detailTarget"]>,
): InspectionRequest {
  return { actionId: (current?.actionId ?? 0) + 1, target };
}
