"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Check,
  X,
  ArrowRight,
  Lightbulb,
  GripVertical,
} from "lucide-react";
import { useState, useEffect } from "react";
import { shuffleOptions } from "@/lib/shuffle";

interface Question {
  id: string;
  type: string;
  topic: string;
  difficulty: string;
  questionText: string;
  options?: string[];
  hint?: string;
  timeEstimate: number;
  matchingPairs?: { left: string; right: string }[];
  orderingItems?: string[];
  correctAnswer?: string;
}

interface QuestionCardProps {
  question: Question;
  selectedAnswer: any;
  onSelectAnswer: (answer: any) => void;
  disabled?: boolean;
  showHint?: boolean;
  showFeedback?: boolean;
  isCorrect?: boolean;
  optionSeed?: number;
}

export function QuestionCard({
  question,
  selectedAnswer,
  onSelectAnswer,
  disabled = false,
  showHint = false,
  showFeedback = false,
  isCorrect,
  optionSeed,
}: QuestionCardProps) {
  const difficultyColors: Record<string, string> = {
    easy: "bg-chart-2/15 text-chart-2 border-chart-2/25",
    medium: "bg-chart-4/15 text-chart-4 border-chart-4/25",
    hard: "bg-destructive/15 text-destructive border-destructive/25",
  };

  const typeLabels: Record<string, string> = {
    multiple_choice: "Multiple Choice",
    true_false: "True / False",
    fill_blank: "Fill in the Blank",
    short_answer: "Short Answer",
    ordering: "Ordering",
    matching: "Matching",
  };

  // -- Hint Logic --
  const [isHintVisible, setIsHintVisible] = useState(false);

  useEffect(() => {
    setIsHintVisible(false);
  }, [question.id]);

  // -- Option Shuffling Logic --
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number>(-1);
  const [shuffledToOriginalMap, setShuffledToOriginalMap] = useState<
    Map<string, string>
  >(new Map());

  useEffect(() => {
    if (
      (question.type === "multiple_choice" ||
        question.type === "true_false") &&
      question.options
    ) {
      if (optionSeed !== undefined) {
        const shuffled = shuffleOptions(question.options, optionSeed);
        const labelMap = new Map<string, string>();

        if (question.type === "true_false") {
          shuffled.forEach((option, index) => {
            const displayLabel = String.fromCharCode(65 + index);
            const actualValue = option.replace(/^[A-Z]\)\s*/, "") || option;
            labelMap.set(displayLabel, actualValue);
          });

          const correctOptionIndex = shuffled.findIndex((opt) => {
            const actualValue = opt.replace(/^[A-Z]\)\s*/, "") || opt;
            return actualValue === question.correctAnswer;
          });
          setCorrectAnswerIndex(correctOptionIndex);

          const formatted = shuffled.map((option, index) => {
            const newLabel = String.fromCharCode(65 + index);
            const textWithoutLabel = option.replace(/^[A-Z]\)\s*/, "");
            return `${newLabel}) ${textWithoutLabel}`;
          });

          setShuffledOptions(formatted);
          setShuffledToOriginalMap(labelMap);
        } else {
          const correctOriginalLabel = question.correctAnswer;
          const correctOptionIndex = shuffled.findIndex(
            (opt) =>
              opt.charAt(0) === correctOriginalLabel ||
              opt === correctOriginalLabel
          );
          setCorrectAnswerIndex(correctOptionIndex);

          const renumbered = shuffled.map((option, index) => {
            const originalLabel = option.charAt(0);
            const newLabel = String.fromCharCode(65 + index);
            labelMap.set(newLabel, originalLabel);
            const textWithoutLabel = option.replace(/^[A-Z]\)\s*/, "");
            return `${newLabel}) ${textWithoutLabel}`;
          });

          setShuffledOptions(renumbered);
          setShuffledToOriginalMap(labelMap);
        }
      } else {
        if (question.type === "true_false") {
          const labelMap = new Map<string, string>();
          question.options.forEach((option, index) => {
            const displayLabel = String.fromCharCode(65 + index);
            const actualValue = option.replace(/^[A-Z]\)\s*/, "") || option;
            labelMap.set(displayLabel, actualValue);
          });
          setShuffledToOriginalMap(labelMap);

          const correctIndex =
            question.options?.findIndex((opt) => {
              const actualValue = opt.replace(/^[A-Z]\)\s*/, "") || opt;
              return actualValue === question.correctAnswer;
            }) ?? -1;
          setCorrectAnswerIndex(correctIndex);

          setShuffledOptions(question.options);
        } else {
          setShuffledOptions(question.options);
          const correctIndex =
            question.options?.findIndex(
              (opt) =>
                opt.charAt(0) === question.correctAnswer ||
                opt === question.correctAnswer
            ) ?? -1;
          setCorrectAnswerIndex(correctIndex);
          setShuffledToOriginalMap(new Map());
        }
      }
    }
  }, [
    question.id,
    question.options,
    optionSeed,
    question.type,
    question.correctAnswer,
  ]);

  // -- Ordering Logic --
  const [shuffledOrder, setShuffledOrder] = useState<string[]>([]);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  useEffect(() => {
    if (question.type === "ordering" && question.orderingItems) {
      if (selectedAnswer && Array.isArray(selectedAnswer)) {
        setShuffledOrder(selectedAnswer);
      } else {
        const shuffled = [...question.orderingItems].sort(
          () => Math.random() - 0.5
        );
        setShuffledOrder(shuffled);
        onSelectAnswer(shuffled);
      }
    }
  }, [question, selectedAnswer, onSelectAnswer]);

  const handleDragStart = (index: number) => {
    if (disabled) return;
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (disabled || draggedItemIndex === null) return;
    if (draggedItemIndex === index) return;

    const newOrder = [...shuffledOrder];
    const draggedItem = newOrder[draggedItemIndex];
    newOrder.splice(draggedItemIndex, 1);
    newOrder.splice(index, 0, draggedItem);

    setShuffledOrder(newOrder);
    onSelectAnswer(newOrder);
    setDraggedItemIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
  };

  // -- Matching Logic --
  const [matchingState, setMatchingState] = useState<
    { left: string; right: string | null }[]
  >([]);
  const [activeLeft, setActiveLeft] = useState<string | null>(null);

  useEffect(() => {
    if (question.type === "matching" && question.matchingPairs) {
      if (selectedAnswer && Array.isArray(selectedAnswer)) {
        setMatchingState(selectedAnswer);
      } else {
        const initial = question.matchingPairs.map((p) => ({
          left: p.left,
          right: null,
        }));
        setMatchingState(initial);
        onSelectAnswer(initial);
      }
    }
  }, [question, selectedAnswer, onSelectAnswer]);

  const handleMatchClick = (side: "left" | "right", val: string) => {
    if (disabled) return;

    if (side === "left") {
      setActiveLeft(val);
    } else {
      if (activeLeft) {
        const newState = matchingState.map((pair) =>
          pair.left === activeLeft ? { ...pair, right: val } : pair
        );
        setMatchingState(newState);
        onSelectAnswer(newState);
        setActiveLeft(null);
      }
    }
  };

  return (
    <Card className="p-4 sm:p-6 border-border animate-in fade-in duration-300">
      {/* Question metadata */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex gap-2 flex-wrap">
          <Badge className={difficultyColors[question.difficulty] || "bg-muted text-muted-foreground"}>
            {question.difficulty}
          </Badge>
          <Badge variant="outline" className="text-xs font-normal capitalize border-border">
            {typeLabels[question.type] || question.type}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground font-medium tabular-nums shrink-0">
          ~{question.timeEstimate}s
        </span>
      </div>

      {/* Question text */}
      <h3 className="text-base sm:text-lg font-medium text-foreground leading-relaxed mb-5 sm:mb-6">
        {question.questionText}
      </h3>

      {/* Multiple Choice / True-False */}
      {(question.type === "multiple_choice" ||
        question.type === "true_false") &&
        shuffledOptions.length > 0 && (
          <div className="space-y-2.5">
            {shuffledOptions.map((option, index) => {
              const newLabel = option.charAt(0);
              const originalLabel =
                shuffledToOriginalMap.get(newLabel) || newLabel;
              const isSelected =
                selectedAnswer === originalLabel || selectedAnswer === option;
              const isCorrectOption = index === correctAnswerIndex;

              let optionClasses =
                "flex items-center justify-between p-3 sm:p-4 border rounded-xl cursor-pointer transition-all ";

              if (showFeedback) {
                if (isCorrectOption) {
                  optionClasses +=
                    "border-chart-2/40 bg-chart-2/8 text-foreground ring-1 ring-chart-2/25";
                } else if (isSelected) {
                  optionClasses +=
                    "border-destructive/40 bg-destructive/5 text-foreground ring-1 ring-destructive/25";
                } else {
                  optionClasses += "border-border opacity-40";
                }
              } else {
                optionClasses += isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/25"
                  : "border-border hover:border-primary/40 hover:bg-accent/30";
              }

              return (
                <label
                  key={index}
                  className={`${optionClasses} ${
                    disabled ? "cursor-not-allowed" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="radio"
                      name="answer"
                      value={option.charAt(0)}
                      checked={isSelected}
                      onChange={() => {
                        const newLabel = option.charAt(0);
                        const originalLabel =
                          shuffledToOriginalMap.get(newLabel) || newLabel;
                        onSelectAnswer(originalLabel);
                      }}
                      disabled={disabled}
                      className="w-4 h-4 text-primary accent-[var(--color-primary)] shrink-0"
                    />
                    <span className="text-sm sm:text-base font-medium">
                      {option}
                    </span>
                  </div>
                  {showFeedback && isCorrectOption && (
                    <Check className="w-5 h-5 text-chart-2 shrink-0" />
                  )}
                  {showFeedback && isSelected && !isCorrectOption && (
                    <X className="w-5 h-5 text-destructive shrink-0" />
                  )}
                </label>
              );
            })}
          </div>
        )}

      {/* Fill Blank */}
      {question.type === "fill_blank" && (
        <div className="space-y-4">
          <input
            type="text"
            value={selectedAnswer || ""}
            onChange={(e) => onSelectAnswer(e.target.value)}
            disabled={disabled}
            placeholder="Type your answer..."
            className="w-full p-3 sm:p-4 border border-border rounded-xl bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 ring-primary/20 focus:border-primary/40 outline-none transition-all text-sm sm:text-base"
          />
          {showFeedback && (
            <div className="text-sm font-medium text-chart-2 bg-chart-2/8 border border-chart-2/15 rounded-lg p-3">
              Correct Answer: {question.correctAnswer}
            </div>
          )}
        </div>
      )}

      {/* Short Answer */}
      {question.type === "short_answer" && (
        <div className="space-y-4">
          <textarea
            value={selectedAnswer || ""}
            onChange={(e) => onSelectAnswer(e.target.value)}
            disabled={disabled}
            placeholder="Type your answer..."
            className="w-full p-3 sm:p-4 border border-border rounded-xl bg-card text-foreground placeholder:text-muted-foreground min-h-[100px] sm:min-h-[120px] focus:ring-2 ring-primary/20 focus:border-primary/40 outline-none transition-all text-sm sm:text-base resize-y"
          />
          {showFeedback && (
            <div className="text-sm text-muted-foreground bg-muted/50 border border-border p-3 rounded-lg">
              <strong className="text-foreground">Model Answer:</strong>{" "}
              {question.correctAnswer}
            </div>
          )}
        </div>
      )}

      {/* Ordering */}
      {question.type === "ordering" && (
        <div className="space-y-2">
          {shuffledOrder.map((item, idx) => (
            <div
              key={item}
              draggable={!disabled}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-3 border rounded-xl bg-card transition-all ${
                draggedItemIndex === idx
                  ? "opacity-50 border-dashed border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              } ${disabled ? "cursor-default" : "cursor-move"}`}
            >
              <div className="cursor-grab active:cursor-grabbing text-muted-foreground">
                <GripVertical className="w-5 h-5" />
              </div>
              <span className="w-6 h-6 flex items-center justify-center bg-primary/10 text-primary rounded-full text-xs font-bold shrink-0">
                {idx + 1}
              </span>
              <span className="flex-1 select-none text-sm sm:text-base text-foreground">
                {item}
              </span>
            </div>
          ))}
          {showFeedback && (
            <div className="text-sm font-medium text-chart-2 bg-chart-2/8 border border-chart-2/15 rounded-lg p-3 mt-2">
              <p className="mb-1">Correct Order:</p>
              {question.orderingItems?.map((it, i) => (
                <div key={i} className="text-foreground font-normal">
                  {i + 1}. {it}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Matching */}
      {question.type === "matching" &&
        (() => {
          const uniquePairs =
            question.matchingPairs?.filter(
              (pair, index, self) =>
                index === self.findIndex((p) => p.left === pair.left)
            ) || [];

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                  Items
                </h4>
                {uniquePairs.map((pair, index) => {
                  const currentMatch = matchingState.find(
                    (m) => m.left === pair.left
                  )?.right;
                  return (
                    <div
                      key={`left-${index}-${pair.left}`}
                      onClick={() => handleMatchClick("left", pair.left)}
                      className={`p-3 border rounded-xl cursor-pointer transition-all text-sm sm:text-base ${
                        activeLeft === pair.left
                          ? "border-primary bg-primary/5 ring-1 ring-primary/25"
                          : currentMatch
                          ? "border-chart-2/30 bg-chart-2/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="text-foreground">{pair.left}</div>
                      {currentMatch && (
                        <div className="mt-2 text-xs font-medium text-chart-2 flex items-center gap-1 bg-chart-2/10 p-1.5 rounded-md">
                          <ArrowRight className="w-3 h-3" /> {currentMatch}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                  Matches
                </h4>
                {Array.from(
                  new Set(
                    question.matchingPairs?.map((pair) => pair.right) || []
                  )
                )
                  .sort()
                  .map((rightVal, index) => (
                    <div
                      key={`right-${index}-${rightVal}`}
                      onClick={() => handleMatchClick("right", rightVal)}
                      className="p-3 border border-border rounded-xl cursor-pointer hover:border-primary/40 hover:bg-accent/30 transition-all text-sm sm:text-base text-foreground"
                    >
                      {rightVal}
                    </div>
                  ))}
              </div>
              {showFeedback && (
                <div className="sm:col-span-2 text-sm font-medium text-chart-2 bg-chart-2/8 border border-chart-2/15 rounded-lg p-3 mt-1">
                  Pairs:{" "}
                  {uniquePairs
                    .map((p) => `${p.left} → ${p.right}`)
                    .join(", ")}
                </div>
              )}
            </div>
          );
        })()}

      {/* Hint */}
      {showHint && question.hint && (
        <div className="mt-5">
          {!isHintVisible ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsHintVisible(true)}
              className="border-chart-4/40 text-chart-4 hover:bg-chart-4/10 hover:border-chart-4/60 gap-2"
            >
              <Lightbulb className="w-4 h-4" />
              Show Hint
            </Button>
          ) : (
            <div className="p-3 sm:p-4 bg-chart-4/8 border border-chart-4/20 text-foreground rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2 font-semibold text-sm mb-1 text-chart-4">
                <Lightbulb className="w-4 h-4" />
                Hint
              </div>
              <div className="text-sm leading-relaxed text-muted-foreground">
                {question.hint}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
