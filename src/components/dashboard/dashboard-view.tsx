"use client";

import { useMemo } from "react";
import { Target, FileText, Clock, Eye } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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

    return {
      avgScore,
      activeQuizzes: attempts.length, // Or maybe unique quizzes? Legacy counts attempts/quizzes.
      timeInvested,
    };
  }, [attempts]);

  const performanceData = [
    { name: "Correct (%)", value: stats.avgScore, color: "#22c55e" },
    { name: "Incorrect (%)", value: 100 - stats.avgScore, color: "#f87171" },
  ];

  const chartData = [...attempts]
    .filter((a) => a.status === "completed")
    .reverse()
    .map((a) => ({
      name: new Date(a.started_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      score: Math.round(a.score * 100 || 0),
    }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats Cards */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Avg Score</p>
              <h3 className="text-2xl font-bold text-foreground">
                {stats.avgScore}%
              </h3>
            </div>
          </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                Total Attempts
              </p>
              <h3 className="text-2xl font-bold text-foreground">
                {stats.activeQuizzes}
              </h3>
            </div>
          </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                Time Invested
              </p>
              <h3 className="text-2xl font-bold text-foreground">
                {stats.timeInvested} m
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Charts */}
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <h3 className="font-semibold text-foreground mb-4">
            Performance Overview
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={performanceData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {performanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <h3 className="font-semibold text-foreground mb-4">Score History</h3>
          {chartData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis
                    dataKey="name"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    cursor={{ stroke: "#3b82f6", strokeWidth: 1 }}
                    formatter={(value: number | undefined) => [`${value ?? 0}`, "Score (%)"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-muted-foreground">
              No data available yet
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-foreground mb-4">Recent Attempts</h3>
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {attempts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No active attempts.{" "}
              <Link href="/documents" className="text-primary hover:underline">
                Upload a document
              </Link>{" "}
              to start!
            </div>
          ) : (
            attempts.slice(0, 10).map((attempt) => (
              <div
                key={attempt.id}
                className="p-4 border-b border-border last:border-0 flex items-center gap-4 hover:bg-accent transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    (attempt.score * 100 || 0) >= 80
                      ? "bg-green-100 text-green-700"
                      : (attempt.score * 100 || 0) >= 50
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {Math.round(attempt.score * 100 || 0)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {attempt.quizzes?.title || "Unknown Quiz"}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">
                      {attempt.quizzes?.mode} Mode
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(attempt.started_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {attempt.status === "completed" && (
                  <Link href={`/quizzes/${attempt.quiz_id}/results?attempt=${attempt.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      View Results
                    </Button>
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
