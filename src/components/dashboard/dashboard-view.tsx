"use client";

import { useMemo } from "react";
import {
  Target,
  FileText,
  Clock,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Flame,
  ArrowRight,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Attempt {
  id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  time_spent: number;
  started_at: string;
  status: string;
  quizzes: {
    title: string;
    mode: string;
  };
}

interface DashboardViewProps {
  attempts: Attempt[];
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  subtitle,
  trend,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  suffix?: string;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  delay: number;
}) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <Card
      className="group relative overflow-hidden transition-all duration-300 hover:shadow-md animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground tracking-wide">
              {label}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {value}
              </span>
              {suffix && (
                <span className="text-sm font-medium text-muted-foreground">
                  {suffix}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary transition-colors group-hover:bg-primary/15">
              <Icon className="h-5 w-5" />
            </div>
            {trend && (
              <TrendIcon
                className={`h-3.5 w-3.5 ${
                  trend === "up"
                    ? "text-chart-2"
                    : trend === "down"
                      ? "text-destructive"
                      : "text-muted-foreground"
                }`}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const rounded = Math.round(score);
  if (rounded >= 80) {
    return (
      <Badge className="bg-chart-2/15 text-chart-2 border-chart-2/25 hover:bg-chart-2/20 font-semibold tabular-nums">
        {rounded}%
      </Badge>
    );
  }
  if (rounded >= 50) {
    return (
      <Badge className="bg-chart-4/15 text-chart-4 border-chart-4/25 hover:bg-chart-4/20 font-semibold tabular-nums">
        {rounded}%
      </Badge>
    );
  }
  return (
    <Badge className="bg-destructive/15 text-destructive border-destructive/25 hover:bg-destructive/20 font-semibold tabular-nums">
      {rounded}%
    </Badge>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-in fade-in duration-700">
      <div className="rounded-2xl bg-primary/5 p-6 mb-6">
        <Trophy className="h-10 w-10 text-primary/60" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Ready to start learning?
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Upload a document and take your first quiz to see your progress here.
      </p>
      <Link href="/documents">
        <Button size="sm" className="gap-2">
          Get Started
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

// Custom tooltip for charts that respects theme
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground mb-0.5">
        {label}
      </p>
      <p className="text-sm font-semibold text-popover-foreground">
        {payload[0].value}%
      </p>
    </div>
  );
}

export function DashboardView({ attempts }: DashboardViewProps) {
  const stats = useMemo(() => {
    const completedAttempts = attempts.filter((a) => a.status === "completed");
    const avgScore =
      completedAttempts.length > 0
        ? Math.round(
            completedAttempts.reduce(
              (acc, curr) => acc + (curr.score * 100 || 0),
              0
            ) / completedAttempts.length
          )
        : 0;

    const timeInvested = Math.round(
      attempts.reduce((acc, curr) => acc + (curr.time_spent || 0), 0) / 60
    );

    // Calculate streak (consecutive days with attempts)
    const uniqueDays = new Set(
      attempts.map((a) => new Date(a.started_at).toDateString())
    );

    // Determine trend from last 5 vs previous 5
    const recent5 = completedAttempts.slice(0, 5);
    const prev5 = completedAttempts.slice(5, 10);
    const recentAvg =
      recent5.length > 0
        ? recent5.reduce((a, c) => a + (c.score * 100 || 0), 0) /
          recent5.length
        : 0;
    const prevAvg =
      prev5.length > 0
        ? prev5.reduce((a, c) => a + (c.score * 100 || 0), 0) / prev5.length
        : 0;
    const trend: "up" | "down" | "neutral" =
      prev5.length === 0
        ? "neutral"
        : recentAvg > prevAvg + 2
          ? "up"
          : recentAvg < prevAvg - 2
            ? "down"
            : "neutral";

    return {
      avgScore,
      totalAttempts: attempts.length,
      completedCount: completedAttempts.length,
      timeInvested,
      streak: uniqueDays.size,
      trend,
    };
  }, [attempts]);

  const chartData = useMemo(
    () =>
      [...attempts]
        .filter((a) => a.status === "completed")
        .reverse()
        .map((a) => ({
          name: new Date(a.started_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          score: Math.round(a.score * 100 || 0),
        })),
    [attempts]
  );

  const performanceData = [
    { name: "Correct", value: stats.avgScore },
    { name: "Incorrect", value: 100 - stats.avgScore },
  ];

  if (attempts.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Greeting & Summary */}
      <div
        className="animate-in fade-in slide-in-from-bottom-2 duration-500"
        style={{ animationFillMode: "backwards" }}
      >
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {stats.completedCount} quiz{stats.completedCount !== 1 ? "zes" : ""}{" "}
          completed across {stats.streak} day
          {stats.streak !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={Target}
          label="Avg Score"
          value={stats.avgScore}
          suffix="%"
          trend={stats.trend}
          delay={80}
        />
        <StatCard
          icon={FileText}
          label="Attempts"
          value={stats.totalAttempts}
          subtitle={`${stats.completedCount} completed`}
          delay={160}
        />
        <StatCard
          icon={Clock}
          label="Time Spent"
          value={stats.timeInvested}
          suffix="min"
          delay={240}
        />
        <StatCard
          icon={Flame}
          label="Days Active"
          value={stats.streak}
          subtitle="unique days"
          delay={320}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        {/* Performance Donut - smaller */}
        <Card
          className="lg:col-span-2 animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: "400ms", animationFillMode: "backwards" }}
        >
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Performance</CardTitle>
            <CardDescription>Overall accuracy</CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="relative h-48 md:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={performanceData}
                    innerRadius="60%"
                    outerRadius="85%"
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    <Cell
                      fill="var(--color-chart-2)"
                      className="drop-shadow-sm"
                    />
                    <Cell fill="var(--color-muted)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-foreground tabular-nums">
                  {stats.avgScore}%
                </span>
                <span className="text-xs text-muted-foreground">accuracy</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-chart-2" />
                <span className="text-xs text-muted-foreground">Correct</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-muted" />
                <span className="text-xs text-muted-foreground">Incorrect</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score History - larger */}
        <Card
          className="lg:col-span-3 animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: "480ms", animationFillMode: "backwards" }}
        >
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Score History
            </CardTitle>
            <CardDescription>Your recent quiz scores</CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            {chartData.length > 1 ? (
              <div className="h-48 md:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
                  >
                    <defs>
                      <linearGradient
                        id="scoreGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="var(--color-primary)"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="100%"
                          stopColor="var(--color-primary)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "var(--color-muted-foreground)" }}
                    />
                    <YAxis
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                      tick={{ fill: "var(--color-muted-foreground)" }}
                    />
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="var(--color-primary)"
                      strokeWidth={2}
                      fill="url(#scoreGradient)"
                      dot={{
                        fill: "var(--color-primary)",
                        r: 3,
                        strokeWidth: 0,
                      }}
                      activeDot={{
                        r: 5,
                        fill: "var(--color-primary)",
                        strokeWidth: 2,
                        stroke: "var(--color-card)",
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 md:h-56 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Complete more quizzes to see trends
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Attempts */}
      <div
        className="animate-in fade-in slide-in-from-bottom-4 duration-500"
        style={{ animationDelay: "560ms", animationFillMode: "backwards" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Recent Attempts
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your latest quiz activity
            </p>
          </div>
          {attempts.length > 5 && (
            <Link href="/quizzes">
              <Button variant="ghost" size="sm" className="text-xs gap-1.5">
                View All
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
        </div>

        <Card className="overflow-hidden">
          {/* Mobile: stacked cards | Desktop: table-style rows */}
          <div className="divide-y divide-border">
            {attempts.slice(0, 8).map((attempt, i) => {
              const score = Math.round(attempt.score * 100 || 0);
              return (
                <div
                  key={attempt.id}
                  className="flex items-center gap-3 md:gap-4 p-3 md:px-5 md:py-4 transition-colors hover:bg-accent/50 animate-in fade-in duration-300"
                  style={{
                    animationDelay: `${600 + i * 50}ms`,
                    animationFillMode: "backwards",
                  }}
                >
                  {/* Score indicator */}
                  <div className="hidden sm:block shrink-0">
                    <div className="relative h-10 w-10">
                      <svg
                        className="h-10 w-10 -rotate-90"
                        viewBox="0 0 36 36"
                      >
                        <circle
                          cx="18"
                          cy="18"
                          r="15"
                          fill="none"
                          stroke="var(--color-border)"
                          strokeWidth="3"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15"
                          fill="none"
                          stroke={
                            score >= 80
                              ? "var(--color-chart-2)"
                              : score >= 50
                                ? "var(--color-chart-4)"
                                : "var(--color-destructive)"
                          }
                          strokeWidth="3"
                          strokeDasharray={`${(score / 100) * 94.25} 94.25`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground tabular-nums">
                        {score}
                      </span>
                    </div>
                  </div>

                  {/* Mobile score badge */}
                  <div className="sm:hidden shrink-0">
                    <ScoreBadge score={score} />
                  </div>

                  {/* Quiz info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {attempt.quizzes?.title || "Unknown Quiz"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4 font-normal"
                      >
                        {attempt.quizzes?.mode}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(attempt.started_at).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Score progress (desktop) */}
                  <div className="hidden md:block w-24 shrink-0">
                    <Progress value={score} className="h-1.5" />
                  </div>

                  {/* Action */}
                  {attempt.status === "completed" ? (
                    <Link
                      href={`/quizzes/${attempt.quiz_id}/results?attempt=${attempt.id}`}
                      className="shrink-0"
                    >
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-muted-foreground shrink-0"
                    >
                      {attempt.status}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
