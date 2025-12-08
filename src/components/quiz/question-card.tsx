"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, ArrowUp, ArrowDown, ArrowRight, Lightbulb } from "lucide-react";
import { useState, useEffect } from "react";

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
}

export function QuestionCard({
  question,
  selectedAnswer,
  onSelectAnswer,
  disabled = false,
  showHint = false,
  showFeedback = false,
  isCorrect,
}: QuestionCardProps) {
  
  const difficultyColors = {
    easy: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    hard: "bg-red-100 text-red-800",
  };

  // -- Ordering Logic --
  const [shuffledOrder, setShuffledOrder] = useState<string[]>([]);
  
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

  const handleOrderMove = (index: number, direction: 'up' | 'down') => {
    if (disabled) return;
    const newOrder = [...shuffledOrder];
    if (direction === 'up' && index > 0) {
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    setShuffledOrder(newOrder);
    onSelectAnswer(newOrder);
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
              // Clear duplicate usage
              const cleanedState = newState.map(pair => 
                  pair.left !== activeLeft && pair.right === val ? { ...pair, right: null } : pair
              );
              setMatchingState(cleanedState);
              onSelectAnswer(cleanedState);
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
        question.options && (
          <div className="space-y-3">
            {question.options.map((option, index) => {
                const isSelected = selectedAnswer === option.charAt(0) || selectedAnswer === option;
                // Determine styling based on feedback
                let style = "flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ";
                
                if (showFeedback) {
                    if (option.charAt(0) === question.correctAnswer || option === question.correctAnswer) {
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
                        value={option.charAt(0)} // Assuming 'A', 'B' etc. or full 'True'/'False'
                        checked={isSelected}
                        onChange={() => onSelectAnswer(question.type === 'multiple_choice' ? option.charAt(0) : option)}
                        disabled={disabled}
                        className="w-4 h-4 text-primary"
                        />
                        <span className="font-medium">{option}</span>
                    </div>
                    {showFeedback && (option.charAt(0) === question.correctAnswer || option === question.correctAnswer) && <Check className="w-5 h-5 text-green-600" />}
                    {showFeedback && isSelected && (option.charAt(0) !== question.correctAnswer && option !== question.correctAnswer) && <X className="w-5 h-5 text-red-600" />}
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
                  <div key={item} className="flex items-center gap-3 p-3 border rounded-lg bg-white">
                      <span className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded-full text-xs font-bold">{idx+1}</span>
                      <span className="flex-1">{item}</span>
                      {!disabled && (
                          <div className="flex flex-col">
                              <button onClick={() => handleOrderMove(idx, 'up')} disabled={idx === 0} className="hover:text-primary"><ArrowUp className="w-4 h-4" /></button>
                              <button onClick={() => handleOrderMove(idx, 'down')} disabled={idx === shuffledOrder.length - 1} className="hover:text-primary"><ArrowDown className="w-4 h-4" /></button>
                          </div>
                      )}
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
      {question.type === "matching" && (
          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <h4 className="font-semibold text-xs text-muted-foreground uppercase">Items</h4>
                  {question.matchingPairs?.map(pair => {
                      const currentMatch = matchingState.find(m => m.left === pair.left)?.right;
                      return (
                      <div 
                        key={pair.left} 
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
                  {/* Show right items shuffled or list? Let's show the unique right items from the question definition */}
                  {/* Ideally we should shuffle these once. For now simply mapping them */}
                  {question.matchingPairs?.map(pair => pair.right).sort().map(rightVal => {
                      // is this value matched?
                      const isMatched = matchingState.some(m => m.right === rightVal);
                      return (
                        <div 
                            key={rightVal}
                            onClick={() => handleMatchClick('right', rightVal)}
                            className={`p-3 border rounded-lg cursor-pointer ${isMatched ? 'opacity-50' : ''}`}
                        >
                            {rightVal}
                        </div>
                      )
                  })}
              </div>
              {showFeedback && (
                   <div className="col-span-2 text-sm text-green-700 font-medium mt-2 bg-green-50 p-2 rounded">
                       Pairs: {question.matchingPairs?.map(p => `${p.left} -> ${p.right}`).join(', ')}
                   </div>
               )}
          </div>
      )}

      {showHint && question.hint && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg">
            <div className="flex items-center gap-2 font-semibold mb-1">
                <Lightbulb className="w-4 h-4" />
                Hint:
            </div>
            <div className="text-sm leading-relaxed">
                {question.hint}
            </div>
        </div>
      )}

    </Card>
  );
}
