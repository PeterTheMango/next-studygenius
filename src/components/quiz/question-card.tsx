"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, ArrowUp, ArrowDown, ArrowRight, Lightbulb, GripVertical } from "lucide-react";
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
  showFeedback?: boolean; // Added to show feedback inline
  isCorrect?: boolean;
  optionSeed?: number; // Seed for shuffling options
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
  
  const difficultyColors = {
    easy: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    hard: "bg-red-100 text-red-800",
  };

  // -- Hint Logic --
  const [isHintVisible, setIsHintVisible] = useState(false);

  // Reset hint visibility when question changes
  useEffect(() => {
    setIsHintVisible(false);
  }, [question.id]);

  // -- Option Shuffling Logic --
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number>(-1);
  const [shuffledToOriginalMap, setShuffledToOriginalMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if ((question.type === 'multiple_choice' || question.type === 'true_false') && question.options) {
      // Shuffle options using the provided seed for consistency
      if (optionSeed !== undefined) {
        const shuffled = shuffleOptions(question.options, optionSeed);

        // Create mapping for answer values
        const labelMap = new Map<string, string>();

        if (question.type === 'true_false') {
          // For true/false, map display labels (A, B) to actual values (True, False)
          shuffled.forEach((option, index) => {
            const displayLabel = String.fromCharCode(65 + index); // A, B
            // Extract the actual value (True or False) from option
            const actualValue = option.replace(/^[A-Z]\)\s*/, '') || option;
            labelMap.set(displayLabel, actualValue);
          });

          // Find correct answer index based on actual value
          const correctOptionIndex = shuffled.findIndex(opt => {
            const actualValue = opt.replace(/^[A-Z]\)\s*/, '') || opt;
            return actualValue === question.correctAnswer;
          });
          setCorrectAnswerIndex(correctOptionIndex);

          // Format options with A) and B) prefixes
          const formatted = shuffled.map((option, index) => {
            const newLabel = String.fromCharCode(65 + index);
            const textWithoutLabel = option.replace(/^[A-Z]\)\s*/, '');
            return `${newLabel}) ${textWithoutLabel}`;
          });

          setShuffledOptions(formatted);
          setShuffledToOriginalMap(labelMap);
        } else {
          // Multiple choice: map display labels to original labels
          const correctOriginalLabel = question.correctAnswer;
          const correctOptionIndex = shuffled.findIndex(opt =>
            opt.charAt(0) === correctOriginalLabel || opt === correctOriginalLabel
          );
          setCorrectAnswerIndex(correctOptionIndex);

          // Renumber options to always show A, B, C, D in order
          const renumbered = shuffled.map((option, index) => {
            const originalLabel = option.charAt(0);
            const newLabel = String.fromCharCode(65 + index);
            labelMap.set(newLabel, originalLabel);
            const textWithoutLabel = option.replace(/^[A-Z]\)\s*/, '');
            return `${newLabel}) ${textWithoutLabel}`;
          });

          setShuffledOptions(renumbered);
          setShuffledToOriginalMap(labelMap);
        }
      } else {
        // Fallback to original order if no seed provided
        if (question.type === 'true_false') {
          // Create mapping for true/false without shuffling
          const labelMap = new Map<string, string>();
          question.options.forEach((option, index) => {
            const displayLabel = String.fromCharCode(65 + index);
            const actualValue = option.replace(/^[A-Z]\)\s*/, '') || option;
            labelMap.set(displayLabel, actualValue);
          });
          setShuffledToOriginalMap(labelMap);

          // Find correct answer
          const correctIndex = question.options?.findIndex(opt => {
            const actualValue = opt.replace(/^[A-Z]\)\s*/, '') || opt;
            return actualValue === question.correctAnswer;
          }) ?? -1;
          setCorrectAnswerIndex(correctIndex);

          setShuffledOptions(question.options);
        } else {
          // Multiple choice without shuffling
          setShuffledOptions(question.options);
          const correctIndex = question.options?.findIndex(opt =>
            opt.charAt(0) === question.correctAnswer || opt === question.correctAnswer
          ) ?? -1;
          setCorrectAnswerIndex(correctIndex);
          setShuffledToOriginalMap(new Map());
        }
      }
    }
  }, [question.id, question.options, optionSeed, question.type, question.correctAnswer]);

  // -- Ordering Logic --
  const [shuffledOrder, setShuffledOrder] = useState<string[]>([]);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  
  useEffect(() => {
    if (question.type === 'ordering' && question.orderingItems) {
      if (selectedAnswer && Array.isArray(selectedAnswer)) {
          setShuffledOrder(selectedAnswer);
      } else {
          // Shuffle initially
          const shuffled = [...question.orderingItems].sort(() => Math.random() - 0.5);
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
    e.preventDefault(); // allow drop
    if (disabled || draggedItemIndex === null) return;
    if (draggedItemIndex === index) return;

    const newOrder = [...shuffledOrder];
    const draggedItem = newOrder[draggedItemIndex];
    
    // Remove from old position
    newOrder.splice(draggedItemIndex, 1);
    // Insert at new position
    newOrder.splice(index, 0, draggedItem);
    
    setShuffledOrder(newOrder);
    onSelectAnswer(newOrder);
    setDraggedItemIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedItemIndex(null);
  };

  // -- Matching Logic --
  const [matchingState, setMatchingState] = useState<{left: string, right: string | null}[]>([]);
  const [activeLeft, setActiveLeft] = useState<string | null>(null);

  useEffect(() => {
      if (question.type === 'matching' && question.matchingPairs) {
          if (selectedAnswer && Array.isArray(selectedAnswer)) {
              setMatchingState(selectedAnswer);
          } else {
              const initial = question.matchingPairs.map(p => ({ left: p.left, right: null }));
              setMatchingState(initial);
              onSelectAnswer(initial);
          }
      }
  }, [question, selectedAnswer, onSelectAnswer]);

  const handleMatchClick = (side: 'left'|'right', val: string) => {
      if (disabled) return;
      
      if (side === 'left') {
          setActiveLeft(val);
      } else {
          if (activeLeft) {
              const newState = matchingState.map(pair =>
                  pair.left === activeLeft ? { ...pair, right: val } : pair
              );
              setMatchingState(newState);
              onSelectAnswer(newState);
              setActiveLeft(null);
          }
      }
  };


  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
            <Badge
            className={
                difficultyColors[
                question.difficulty as keyof typeof difficultyColors
                ]
            }
            >
            {question.difficulty}
            </Badge>
            <Badge variant="outline">{question.type}</Badge>
        </div>
        <span className="text-sm text-muted-foreground">
          ~{question.timeEstimate}s
        </span>
      </div>

      <h3 className="text-lg font-medium mb-6">{question.questionText}</h3>

      {/* Multiple Choice / True-False */}
      {(question.type === "multiple_choice" ||
        question.type === "true_false") &&
        shuffledOptions.length > 0 && (
          <div className="space-y-3">
            {shuffledOptions.map((option, index) => {
                const newLabel = option.charAt(0);
                const originalLabel = shuffledToOriginalMap.get(newLabel) || newLabel;
                // Check if selected answer matches either the original label or the full option text
                const isSelected = selectedAnswer === originalLabel || selectedAnswer === option;
                const isCorrectOption = index === correctAnswerIndex;

                // Determine styling based on feedback
                let style = "flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ";

                if (showFeedback) {
                    if (isCorrectOption) {
                        style += "border-green-500 bg-green-50 text-green-900";
                    } else if (isSelected) {
                        style += "border-red-500 bg-red-50 text-red-900";
                    } else {
                        style += "border-border opacity-50";
                    }
                } else {
                    style += isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50";
                }

                return (
                <label
                    key={index}
                    className={`${style} ${disabled ? "cursor-not-allowed" : ""}`}
                >
                    <div className="flex items-center gap-2">
                        <input
                        type="radio"
                        name="answer"
                        value={option.charAt(0)} // Use the new label (A, B, C, D)
                        checked={isSelected}
                        onChange={() => {
                          const newLabel = option.charAt(0);
                          // Map shuffled label back to original label
                          const originalLabel = shuffledToOriginalMap.get(newLabel) || newLabel;
                          // Both multiple_choice and true_false should use original label
                          onSelectAnswer(originalLabel);
                        }}
                        disabled={disabled}
                        className="w-4 h-4 text-primary"
                        />
                        <span className="font-medium">{option}</span>
                    </div>
                    {showFeedback && isCorrectOption && <Check className="w-5 h-5 text-green-600" />}
                    {showFeedback && isSelected && !isCorrectOption && <X className="w-5 h-5 text-red-600" />}
                </label>
                )
            })}
          </div>
        )}
      
      {/* Fill Blank */}
      {question.type === "fill_blank" && (
          <div className="space-y-4">
               <input
                type="text"
                value={selectedAnswer || ''}
                onChange={(e) => onSelectAnswer(e.target.value)}
                disabled={disabled}
                placeholder="Type your answer..."
                className="w-full p-3 border rounded-md focus:ring-2 ring-primary/20 outline-none"
               />
               {showFeedback && (
                   <div className="text-sm text-green-700 font-medium">
                       Correct Answer: {question.correctAnswer}
                   </div>
               )}
          </div>
      )}

      {/* Short Answer */}
      {question.type === "short_answer" && (
          <div className="space-y-4">
              <textarea
                value={selectedAnswer || ''}
                onChange={(e) => onSelectAnswer(e.target.value)}
                disabled={disabled}
                placeholder="Type your answer..."
                className="w-full p-3 border rounded-md min-h-[100px] focus:ring-2 ring-primary/20 outline-none"
              />
               {showFeedback && (
                   <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded">
                       <strong>Model Answer:</strong> {question.correctAnswer}
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
                    className={`flex items-center gap-3 p-3 border rounded-lg bg-white transition-all cursor-move ${
                        draggedItemIndex === idx ? 'opacity-50 border-dashed border-blue-400 bg-blue-50' : 'hover:border-blue-200'
                    } ${disabled ? 'cursor-default' : ''}`}
                  >
                      <div className="cursor-grab active:cursor-grabbing text-slate-400">
                          <GripVertical className="w-5 h-5" />
                      </div>
                      <span className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded-full text-xs font-bold shrink-0">{idx+1}</span>
                      <span className="flex-1 select-none">{item}</span>
                  </div>
              ))}
               {showFeedback && (
                   <div className="text-sm text-green-700 font-medium mt-2">
                       Correct Order: <br/>
                       {question.orderingItems?.map((it, i) => <div key={i}>{i+1}. {it}</div>)}
                   </div>
               )}
          </div>
      )}

      {/* Matching */}
      {question.type === "matching" && (() => {
          // Filter out duplicate left items to handle AI-generated bad questions
          const uniquePairs = question.matchingPairs?.filter((pair, index, self) =>
            index === self.findIndex((p) => p.left === pair.left)
          ) || [];

          return (
          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <h4 className="font-semibold text-xs text-muted-foreground uppercase">Items</h4>
                  {uniquePairs.map((pair, index) => {
                      const currentMatch = matchingState.find(m => m.left === pair.left)?.right;
                      return (
                      <div
                        key={`left-${index}-${pair.left}`}
                        onClick={() => handleMatchClick('left', pair.left)}
                        className={`p-3 border rounded-lg cursor-pointer ${activeLeft === pair.left ? 'border-primary bg-primary/5' : ''} ${currentMatch ? 'border-blue-200 bg-blue-50' : ''}`}
                      >
                          <div>{pair.left}</div>
                          {currentMatch && (
                            <div className="mt-2 text-xs font-medium text-blue-700 flex items-center gap-1 bg-white/50 p-1 rounded">
                                <ArrowRight className="w-3 h-3" /> {currentMatch}
                            </div>
                          )}
                      </div>
                  )})}
              </div>
              <div className="space-y-2">
                  <h4 className="font-semibold text-xs text-muted-foreground uppercase">Matches</h4>
                  {/* Show unique right items from the question definition */}
                  {Array.from(new Set(question.matchingPairs?.map(pair => pair.right) || [])).sort().map((rightVal, index) => {
                      return (
                        <div
                            key={`right-${index}-${rightVal}`}
                            onClick={() => handleMatchClick('right', rightVal)}
                            className="p-3 border rounded-lg cursor-pointer hover:border-primary/50"
                        >
                            {rightVal}
                        </div>
                      )
                  })}
              </div>
              {showFeedback && (
                   <div className="col-span-2 text-sm text-green-700 font-medium mt-2 bg-green-50 p-2 rounded">
                       Pairs: {uniquePairs.map(p => `${p.left} -> ${p.right}`).join(', ')}
                   </div>
               )}
          </div>
      );
      })()}

      {showHint && question.hint && (
        <div className="mt-4">
          {!isHintVisible ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsHintVisible(true)}
              className="text-amber-700 border-amber-300 hover:bg-amber-50 hover:border-amber-400"
            >
              <Lightbulb className="w-4 h-4 mr-2" />
              Show Hint
            </Button>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg">
              <div className="flex items-center gap-2 font-semibold mb-1">
                <Lightbulb className="w-4 h-4" />
                Hint:
              </div>
              <div className="text-sm leading-relaxed">
                {question.hint}
              </div>
            </div>
          )}
        </div>
      )}

    </Card>
  );
}
