import { useEffect, useState } from "react";
import {
  MessageSquare,
  Activity,
  CheckCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import * as settingsApi from "@/api/endpoints/settings";
import type {
  AnalyticsSummary,
  ConversationDataPoint,
} from "@/api/types/settings";

interface StatCardProps {
  readonly icon: React.ReactNode;
  readonly value: string;
  readonly label: string;
}

function StatCard({ icon, value, label }: StatCardProps): React.ReactElement {
  return (
    <div className="flex flex-1 flex-col gap-3 rounded-xl border border-[var(--app-border)] bg-white p-5 shadow-[0_1px_3px_var(--app-card-shadow)]">
      <div className="text-[var(--app-primary)]">{icon}</div>
      <div className="text-3xl font-semibold text-[var(--app-font-primary)]">
        {value}
      </div>
      <div className="text-sm text-[var(--app-font-secondary)]">{label}</div>
    </div>
  );
}

export function DashboardPage(): React.ReactElement {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [chartData, setChartData] = useState<ConversationDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const [summaryRes, chartRes] = await Promise.all([
          settingsApi.getAnalyticsSummary(),
          settingsApi.getConversationsOverTime(30),
        ]);
        if (summaryRes.data) setSummary(summaryRes.data);
        if (chartRes.data) setChartData([...chartRes.data]);
      } catch {
        // silently fail for dashboard
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <div className="p-8">
      {/* Header with period filters */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--app-font-primary)]">
          Dashboard
        </h1>
        <div className="flex items-center gap-1 rounded-lg border border-[var(--app-border)] bg-white p-0.5">
          <button className="rounded-md px-3 py-1.5 text-xs text-[var(--app-font-secondary)] transition-colors hover:bg-[var(--app-hover-bg)]">
            7d
          </button>
          <button className="rounded-md px-3 py-1.5 text-xs text-[var(--app-font-secondary)] transition-colors hover:bg-[var(--app-hover-bg)]">
            Year
          </button>
          <button className="rounded-md bg-[var(--app-primary)] px-3 py-1.5 text-xs font-medium text-white">
            30day
          </button>
          <button className="rounded-md px-3 py-1.5 text-xs text-[var(--app-font-secondary)] transition-colors hover:bg-[var(--app-hover-bg)]">
            Kind
          </button>
        </div>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="mb-8 flex gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-1 animate-pulse rounded-xl border border-[var(--app-border)] bg-white p-5"
            >
              <div className="mb-3 h-5 w-5 rounded bg-[var(--app-border-light)]" />
              <div className="mb-2 h-8 w-16 rounded bg-[var(--app-border-light)]" />
              <div className="h-4 w-20 rounded bg-[var(--app-border-light)]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-8 flex gap-6">
          <StatCard
            icon={<MessageSquare size={20} />}
            value={String(summary?.total_chats ?? 0)}
            label="Total Chats"
          />
          <StatCard
            icon={<Activity size={20} />}
            value={String(summary?.active_chats ?? 0)}
            label="Active Chats"
          />
          <StatCard
            icon={<CheckCircle size={20} />}
            value={`${((summary?.completion_rate ?? 0) * 100).toFixed(1)}%`}
            label="Completion Rate"
          />
        </div>
      )}

      {/* Chart */}
      <div className="rounded-xl border border-[var(--app-border)] bg-white p-6 shadow-[0_1px_3px_var(--app-card-shadow)]">
        <h2 className="mb-6 text-sm font-medium text-[var(--app-font-secondary)]">
          Conversations over Time
        </h2>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--app-border-light)"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--app-font-muted)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--app-font-muted)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--app-border)",
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="count"
                fill="var(--app-primary)"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
