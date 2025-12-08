
import React, { useState, useEffect } from 'react';
import { Question, Quiz, QuizAttempt } from '../types';
import { Check, X, Clock, HelpCircle, ArrowRight, AlertCircle, Award, GripVertical, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { GeminiService } from '../services/geminiService';

interface QuizPlayerProps {
  quiz: Quiz;
  onComplete: (attempt: QuizAttempt) => void;
  onExit: () => void;
}

export const QuizPlayer: React.FC<QuizPlayerProps> = ({ quiz, onComplete, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, { userAnswer: any; isCorrect: boolean; feedback?: string }>>({});
  const [timeLeft, setTimeLeft] = useState<number>(quiz.questions.length * 60); 
  const [startTime] = useState(Date.now());
  const [showHint, setShowHint] = useState(false);

  // State specific for Ordering/Matching
  const [shuffledOrder, setShuffledOrder] = useState<string[]>([]);
  const [matchingState, setMatchingState] = useState<{left: string, right: string | null}[]>([]);
  const [activeLeft, setActiveLeft] = useState<string | null>(null);

  const currentQuestion = quiz.questions[currentIndex];
  const isLastQuestion = currentIndex === quiz.questions.length - 1;

  // Timer logic for Test mode
  useEffect(() => {
    if (quiz.mode !== 'test') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finishQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [quiz.mode]);

  // Reset state on question change
  useEffect(() => {
    setSelectedAnswer(null);
    setIsAnswered(false);
    setShowHint(false);
    setIsGrading(false);

    if (currentQuestion.type === 'ordering' && currentQuestion.orderingItems) {
        // Shuffle items for ordering
        const shuffled = [...currentQuestion.orderingItems].sort(() => Math.random() - 0.5);
        setShuffledOrder(shuffled);
        setSelectedAnswer(shuffled);
    } 
    else if (currentQuestion.type === 'matching' && currentQuestion.matchingPairs) {
        // Initialize matching pairs state
        const initial = currentQuestion.matchingPairs.map(p => ({ left: p.left, right: null }));
        setMatchingState(initial);
        // We render rights shuffled, but state tracks connection from left
        setSelectedAnswer(initial); // Start with no matches
    }
    else {
        setSelectedAnswer('');
    }
  }, [currentIndex, currentQuestion]);

  // -- Handlers --

  const handleTextAnswer = (val: string) => {
    if (isAnswered && quiz.mode !== 'test') return;
    setSelectedAnswer(val);
  };

  const handleOrderMove = (index: number, direction: 'up' | 'down') => {
      if (isAnswered) return;
      const newOrder = [...shuffledOrder];
      if (direction === 'up' && index > 0) {
          [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      } else if (direction === 'down' && index < newOrder.length - 1) {
          [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      }
      setShuffledOrder(newOrder);
      setSelectedAnswer(newOrder);
  };

  const handleMatchClick = (side: 'left'|'right', val: string) => {
      if (isAnswered) return;
      
      if (side === 'left') {
          setActiveLeft(val);
      } else {
          // If we clicked right and have an active left, make a connection
          if (activeLeft) {
              const newState = matchingState.map(pair => 
                  pair.left === activeLeft ? { ...pair, right: val } : pair
              );
              // If this right value was used elsewhere, clear it
              const cleanedState = newState.map(pair => 
                  pair.left !== activeLeft && pair.right === val ? { ...pair, right: null } : pair
              );
              setMatchingState(cleanedState);
              setSelectedAnswer(cleanedState);
              setActiveLeft(null);
          }
      }
  };

  const submitAnswer = async () => {
    if (!selectedAnswer && currentQuestion.type !== 'matching') return; // Matching might be partially filled

    let isCorrect = false;
    let feedback = '';

    if (currentQuestion.type === 'short_answer') {
        // Use AI Grading
        setIsGrading(true);
        const grading = await GeminiService.evaluateShortAnswer(
            currentQuestion.questionText,
            selectedAnswer,
            currentQuestion.correctAnswer
        );
        setIsGrading(false);
        isCorrect = grading.isCorrect;
        feedback = grading.feedback;
    } 
    else if (currentQuestion.type === 'ordering') {
        // Check if array matches exactly
        isCorrect = JSON.stringify(selectedAnswer) === JSON.stringify(currentQuestion.orderingItems);
    }
    else if (currentQuestion.type === 'matching') {
        // Check if all pairs match
        const allCorrect = currentQuestion.matchingPairs?.every(pair => {
             const userMatch = matchingState.find(m => m.left === pair.left);
             return userMatch?.right === pair.right;
        });
        isCorrect = !!allCorrect;
    }
    else {
        // Standard types
        isCorrect = selectedAnswer.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();
    }
    
    // Record answer
    const newAnswers = {
      ...answers,
      [currentQuestion.id]: { userAnswer: selectedAnswer, isCorrect, feedback }
    };
    setAnswers(newAnswers);
    setIsAnswered(true);

    if (quiz.mode === 'test') {
      if (isLastQuestion) {
        finishQuiz(newAnswers);
      } else {
        handleNext(newAnswers);
      }
    } else if (isCorrect) {
       confetti({
         particleCount: 50,
         spread: 60,
         origin: { y: 0.8 },
         colors: ['#22c55e', '#4ade80']
       });
    }
  };

  const handleNext = (currentAnswers = answers) => {
    if (isLastQuestion && quiz.mode !== 'test') {
      finishQuiz(currentAnswers);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const finishQuiz = (finalAnswers: Record<string, { userAnswer: any; isCorrect: boolean }> = answers) => {
    const totalCorrect = Object.values(finalAnswers).filter(a => a.isCorrect).length;
    const attempt: QuizAttempt = {
      id: crypto.randomUUID(),
      quizId: quiz.id,
      mode: quiz.mode,
      score: (totalCorrect / quiz.questions.length) * 100,
      totalQuestions: quiz.questions.length,
      correctAnswers: totalCorrect,
      timeSpent: (Date.now() - startTime) / 1000,
      completedAt: new Date().toISOString(),
      answers: finalAnswers
    };
    onComplete(attempt);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isCorrect = answers[currentQuestion.id]?.isCorrect;
  const aiFeedback = answers[currentQuestion.id]?.feedback;
  const showFeedback = isAnswered && quiz.mode !== 'test';

  // --- Renderers ---

  const renderFillBlankQuestion = () => {
    const parts = currentQuestion.questionText.split('___');
    return (
        <div className="text-2xl font-semibold text-slate-800 mb-8 leading-relaxed">
            {parts.map((part, i) => (
                <React.Fragment key={i}>
                    {part}
                    {i < parts.length - 1 && (
                        <input
                            type="text"
                            value={selectedAnswer || ''}
                            onChange={(e) => handleTextAnswer(e.target.value)}
                            disabled={showFeedback}
                            placeholder="..."
                            className={`inline-block mx-2 w-40 p-2 border-b-2 bg-transparent focus:outline-none text-center font-bold ${
                                showFeedback 
                                    ? (isCorrect ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700')
                                    : 'border-slate-300 focus:border-blue-600 text-blue-700'
                            }`}
                        />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
  };

  const renderOrdering = () => {
      return (
          <div className="space-y-3">
              {shuffledOrder.map((item, index) => (
                  <div key={item} className={`flex items-center justify-between p-4 rounded-xl border-2 bg-white ${
                      showFeedback 
                        ? (isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50')
                        : 'border-slate-200'
                  }`}>
                      <div className="flex items-center gap-4">
                          <span className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full font-bold text-slate-500">
                              {index + 1}
                          </span>
                          <span className="font-medium text-slate-700">{item}</span>
                      </div>
                      {!showFeedback && (
                          <div className="flex flex-col gap-1">
                              <button 
                                onClick={() => handleOrderMove(index, 'up')}
                                disabled={index === 0}
                                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 disabled:opacity-30"
                              >
                                  <ArrowUp className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleOrderMove(index, 'down')}
                                disabled={index === shuffledOrder.length - 1}
                                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 disabled:opacity-30"
                              >
                                  <ArrowDown className="w-4 h-4" />
                              </button>
                          </div>
                      )}
                  </div>
              ))}
              {showFeedback && !isCorrect && (
                   <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm">
                        <span className="font-bold block mb-1">Correct Order:</span>
                        <ol className="list-decimal list-inside">
                            {currentQuestion.orderingItems?.map(item => <li key={item}>{item}</li>)}
                        </ol>
                   </div>
              )}
          </div>
      )
  };

  const renderMatching = () => {
      // Create a stable list of right-side items to display
      // In a real app we'd want to persist the shuffled order of right items in state
      // For now, we'll derive it from the pairs but randomizing on render is bad, 
      // so lets assume we shuffled them once or just list them. 
      // To keep it simple, let's just display the pairs' right sides in their original order (which is likely unshuffled from Gemini)
      // or shuffle them in useEffect. Let's just shuffle them on the fly based on a seed or just map them.
      // Actually, we need them to be selectable. 
      
      const rightItems = currentQuestion.matchingPairs?.map(p => p.right).sort() || [];

      return (
          <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Items</h4>
                  {currentQuestion.matchingPairs?.map((pair) => {
                      const isSelected = activeLeft === pair.left;
                      const matchedValue = matchingState.find(m => m.left === pair.left)?.right;
                      
                      let style = "p-4 rounded-xl border-2 cursor-pointer transition-all ";
                      if (showFeedback) {
                          style += matchedValue === pair.right ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50";
                      } else {
                          style += isSelected ? "border-blue-500 bg-blue-50" : matchedValue ? "border-blue-200 bg-blue-50" : "border-slate-200 hover:border-blue-300";
                      }

                      return (
                        <div 
                            key={pair.left}
                            onClick={() => handleMatchClick('left', pair.left)}
                            className={style}
                        >
                            <div className="font-medium text-slate-700">{pair.left}</div>
                            {matchedValue && !showFeedback && <div className="text-xs text-blue-600 mt-1">Matched</div>}
                        </div>
                      )
                  })}
              </div>
              <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Matches</h4>
                  {rightItems.map((val) => {
                       const isMatched = matchingState.some(m => m.right === val);
                       let style = "p-4 rounded-xl border-2 cursor-pointer transition-all ";
                       if (showFeedback) {
                           // Find which left item matched to this val
                           const match = matchingState.find(m => m.right === val);
                           const correctLeft = currentQuestion.matchingPairs?.find(p => p.right === val)?.left;
                           const isCorrectMatch = match?.left === correctLeft;
                           style += isCorrectMatch ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50";
                       } else {
                           style += isMatched ? "border-blue-200 bg-blue-50 opacity-50" : "border-slate-200 hover:border-blue-300";
                       }

                       return (
                        <div 
                            key={val}
                            onClick={() => handleMatchClick('right', val)}
                            className={style}
                        >
                            {val}
                        </div>
                       )
                  })}
              </div>
          </div>
      )
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <span className="px-3 py-1 bg-slate-100 rounded-md text-sm font-medium text-slate-600 capitalize">
            {quiz.mode} Mode
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-600 font-medium">
            Question {currentIndex + 1} / {quiz.questions.length}
          </span>
        </div>
        {quiz.mode === 'test' && (
          <div className={`flex items-center gap-2 font-mono text-lg font-bold ${timeLeft < 60 ? 'text-red-500' : 'text-slate-700'}`}>
            <Clock className="w-5 h-5" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-slate-100">
          <div 
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((currentIndex) / quiz.questions.length) * 100}%` }}
          />
        </div>

        <div className="p-8">
          <div className="flex gap-3 mb-6">
            <span className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-wide ${
              currentQuestion.difficulty === 'hard' ? 'bg-red-100 text-red-700' :
              currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              {currentQuestion.difficulty}
            </span>
            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-semibold uppercase tracking-wide">
              {currentQuestion.topic}
            </span>
            {currentQuestion.type !== 'multiple_choice' && (
                <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-semibold uppercase tracking-wide">
                    {currentQuestion.type.replace('_', ' ')}
                </span>
            )}
          </div>

          {currentQuestion.type === 'fill_blank' ? renderFillBlankQuestion() : (
            <h2 className="text-2xl font-semibold text-slate-800 mb-8 leading-relaxed">
                {currentQuestion.questionText}
            </h2>
          )}

          {/* Options Renderer */}
          <div className="space-y-3">
            {(currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'true_false') && (
              currentQuestion.options?.map((option, idx) => {
                const isSelected = selectedAnswer === option;
                let baseStyle = "w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group ";
                
                if (showFeedback) {
                   if (option === currentQuestion.correctAnswer) {
                     baseStyle += "border-green-500 bg-green-50 text-green-900";
                   } else if (isSelected && option !== currentQuestion.correctAnswer) {
                     baseStyle += "border-red-500 bg-red-50 text-red-900";
                   } else {
                     baseStyle += "border-slate-100 opacity-50";
                   }
                } else {
                   if (isSelected) {
                     baseStyle += "border-blue-600 bg-blue-50 text-blue-900";
                   } else {
                     baseStyle += "border-slate-200 hover:border-blue-300 hover:bg-slate-50";
                   }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleTextAnswer(option)}
                    disabled={showFeedback}
                    className={baseStyle}
                  >
                    <span className="font-medium">{option}</span>
                    {showFeedback && option === currentQuestion.correctAnswer && <Check className="w-5 h-5 text-green-600" />}
                    {showFeedback && isSelected && option !== currentQuestion.correctAnswer && <X className="w-5 h-5 text-red-600" />}
                  </button>
                );
              })
            )}

            {currentQuestion.type === 'short_answer' && (
              <div className="space-y-4">
                 <textarea 
                    value={selectedAnswer || ''}
                    onChange={(e) => handleTextAnswer(e.target.value)}
                    disabled={showFeedback || isGrading}
                    placeholder="Type your answer here..."
                    className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none text-lg min-h-[120px]"
                 />
                 {isGrading && (
                     <div className="flex items-center gap-2 text-blue-600 animate-pulse">
                         <Loader2 className="w-5 h-5 animate-spin" />
                         <span>AI is evaluating your answer...</span>
                     </div>
                 )}
                 {showFeedback && (
                   <div className="p-4 bg-green-50 text-green-800 rounded-lg border border-green-200">
                     <span className="font-bold">Model Answer:</span> {currentQuestion.correctAnswer}
                   </div>
                 )}
              </div>
            )}

            {currentQuestion.type === 'ordering' && renderOrdering()}
            {currentQuestion.type === 'matching' && renderMatching()}

          </div>
        </div>

        {/* Footer / Controls */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div>
            {quiz.mode === 'learn' && !isAnswered && currentQuestion.type !== 'short_answer' && (
              <button 
                onClick={() => setShowHint(!showHint)}
                className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors text-sm font-medium"
              >
                <HelpCircle className="w-4 h-4" />
                {showHint ? 'Hide Hint' : 'Need a Hint?'}
              </button>
            )}
            {showHint && (
               <div className="mt-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg max-w-sm">
                 💡 {currentQuestion.hint || "No hint available for this question."}
               </div>
            )}
          </div>

          {!isAnswered ? (
             <button
               onClick={submitAnswer}
               disabled={!selectedAnswer && currentQuestion.type !== 'matching'}
               className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
             >
               {isGrading && <Loader2 className="w-4 h-4 animate-spin" />}
               {quiz.mode === 'test' && isLastQuestion ? 'Finish Quiz' : 'Submit Answer'}
             </button>
          ) : (
             <button
               onClick={() => handleNext()}
               className="px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 flex items-center gap-2 transition-all"
             >
               {isLastQuestion ? 'View Results' : 'Next Question'}
               <ArrowRight className="w-4 h-4" />
             </button>
          )}
        </div>
      </div>

      {/* Explanation Area */}
      {showFeedback && (
        <div className={`mt-6 p-6 rounded-xl border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 shadow-sm'} animate-in fade-in slide-in-from-bottom-4`}>
          <div className="flex items-start gap-4">
             <div className={`p-2 rounded-full ${isCorrect ? 'bg-green-200 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {isCorrect ? <Award className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
             </div>
             <div>
               <h3 className={`text-lg font-bold mb-1 ${isCorrect ? 'text-green-800' : 'text-slate-800'}`}>
                 {isCorrect ? 'Excellent!' : 'Not quite right.'}
               </h3>
               {aiFeedback && (
                   <p className="text-slate-700 font-medium mb-2 border-l-4 border-blue-400 pl-3 py-1 bg-blue-50">
                       AI Feedback: {aiFeedback}
                   </p>
               )}
               <p className="text-slate-600 leading-relaxed">
                 {currentQuestion.explanation}
               </p>
               {currentQuestion.sourceReference && (
                 <p className="mt-2 text-xs text-slate-400 font-medium uppercase tracking-wider">
                   Source: {currentQuestion.sourceReference}
                 </p>
               )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
