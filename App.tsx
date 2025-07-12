

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameState, EvaluationResult, EvaluationCategory } from './types';
import { CHALLENGES, TOTAL_ROUNDS, ROUND_DURATION_SECONDS, FUSION_CHALLENGE_TEMPLATES, FUSION_BASE_CONCEPTS } from './constants';
import { getAiResponse, evaluateAnswers, getFusedIdea } from './geminiService';

// --- ICON COMPONENTS ---

const SwordsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 inline-block text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.25 3.321V5.719c0 .43.124.84.346 1.185l5.23 7.845a.5.5 0 0 1-.423.75H4.5a.5.5 0 0 1-.423-.75l5.23-7.845a1.87 1.87 0 0 0 .346-1.185V3.321a1.25 1.25 0 0 1 2.5 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.75 20.679 v-2.398c0-.43-.124-.84-.346-1.185l-5.23-7.845a.5.5 0 0 0 .423-.75h10.25a.5.5 0 0 0 .423.75l-5.23 7.845a1.87 1.87 0 0 1-.346 1.185v2.398a1.25 1.25 0 0 1-2.5 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.153 10.552 2.5 8.25m19 2.302L21.5 8.25" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.166 4.5H2m17.5 0h-7.166" />
  </svg>
);

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 inline-block text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456z"/>
    </svg>
);

const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-100"></div>
);


// --- UI COMPONENTS ---

const WelcomeScreen = React.memo(({ handleStartGame }: { handleStartGame: (mode: 'Battle' | 'Fusion') => void }) => (
  <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
    <h1 className="text-5xl md:text-7xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-slate-200 to-slate-500">IdeaGPT</h1>
    <p className="mt-2 text-lg text-slate-400 max-w-xl">Two game modes. One ridiculous creative engine. Which path will you choose?</p>
    <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
      <button onClick={() => handleStartGame('Battle')} className="group p-6 bg-slate-800 rounded-xl border border-slate-700 hover:bg-lime-900/50 hover:border-lime-600 transition-all duration-300">
        <h2 className="text-2xl font-bold flex items-center gap-3"><SwordsIcon /> Battle Mode</h2>
        <p className="mt-2 text-left text-slate-400 group-hover:text-slate-300">Go head-to-head against the AI for 10 rounds of absurd creative challenges. An impartial AI judge will score you on creativity, logic, and more.</p>
      </button>
      <button onClick={() => handleStartGame('Fusion')} className="group p-6 bg-slate-800 rounded-xl border border-slate-700 hover:bg-cyan-900/50 hover:border-cyan-600 transition-all duration-300">
        <h2 className="text-2xl font-bold flex items-center gap-3"><SparklesIcon /> Idea Fusion</h2>
        <p className="mt-2 text-left text-slate-400 group-hover:text-slate-300">Collaboratively build a new business idea over 10 sequential questions. At the end, an AI will fuse your plan with its own into a final, wild concept.</p>
      </button>
    </div>
  </div>
));

const PlayingScreen = React.memo(({ round, gameMode, challengeTemplate, baseIdea, userAnswers, currentAnswer, timer, handleRoundSubmit, setCurrentAnswer }: { round: number; gameMode: 'Battle' | 'Fusion' | null; challengeTemplate: string; baseIdea: string; userAnswers: string[]; currentAnswer: string; timer: number; handleRoundSubmit: () => void; setCurrentAnswer: (value: string) => void; }) => {
  const formattedQuestion = useMemo(() => {
    if (gameMode !== 'Fusion') return challengeTemplate;
    let question = challengeTemplate.replace('{{IDEA}}', baseIdea);
    if (round > 0 && userAnswers[0]) {
      question = question.replace(/\{\{NAME\}\}/g, userAnswers[0]);
    }
    return question;
  }, [challengeTemplate, gameMode, baseIdea, round, userAnswers]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-3xl text-center">
        <div className="mb-4 text-slate-400">Round {round + 1} of {TOTAL_ROUNDS} | {gameMode} Mode</div>
        <div className="relative w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-8">
            <div className="absolute top-0 left-0 h-2 bg-lime-400" style={{ width: `${(round + 1) / TOTAL_ROUNDS * 100}%` }}></div>
        </div>
        <p className="text-2xl md:text-3xl font-medium leading-tight text-slate-300 mb-6" dangerouslySetInnerHTML={{ __html: formattedQuestion }} />
        <div className="relative">
          <textarea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            className="w-full h-48 p-4 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-lime-400 focus:outline-none transition-all resize-none"
            placeholder="Your brilliant idea..."
            aria-label="Your answer"
            autoFocus
          />
          <div className="absolute top-3 right-3 text-2xl font-black text-lime-400">{timer}</div>
        </div>
        <button onClick={handleRoundSubmit} className="mt-6 w-full py-3 bg-lime-500 text-slate-900 font-bold rounded-lg hover:bg-lime-400 transition-transform transform hover:scale-105 disabled:bg-slate-600" disabled={!currentAnswer}>
          Submit Answer
        </button>
      </div>
    </div>
  );
});

const LoadingScreen = React.memo(({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
    <LoadingSpinner />
    <p className="mt-6 text-xl text-slate-400 animate-pulse">{message}</p>
  </div>
));

const ResultsScreen = React.memo(({ evaluationResult, handleReset, setGameState }: { evaluationResult: EvaluationResult | null; handleReset: () => void; setGameState: (state: GameState) => void; }) => {
  if (!evaluationResult) return null;
  const overallUserScore = evaluationResult.scorecard.reduce((acc, cat) => acc + cat.userScore, 0);
  const overallAiScore = evaluationResult.scorecard.reduce((acc, cat) => acc + cat.aiScore, 0);
  const overallWinner = overallUserScore > overallAiScore ? 'YOU' : overallUserScore < overallAiScore ? 'IdeaGPT' : 'TIE';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-4xl text-center">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter">The Verdict</h1>
        <p className={`mt-2 text-2xl font-bold ${overallWinner === 'YOU' ? 'text-lime-400' : 'text-rose-400'}`}>{evaluationResult.verdict}</p>
        
        <div className="mt-8 bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="grid grid-cols-3 gap-y-4 text-sm md:text-base font-semibold text-slate-400 mb-4 px-2">
            <span>Category</span>
            <span className="text-center">Your Score</span>
            <span className="text-center">AI Score</span>
          </div>
          {evaluationResult.scorecard.map((cat: EvaluationCategory) => (
            <div key={cat.category} className="grid grid-cols-3 items-center gap-y-2 py-3 px-2 rounded-lg bg-slate-900 mb-2">
              <span className="font-bold text-left">{cat.category}</span>
              <span className={`text-center font-black text-xl ${cat.winner === 'YOU' || cat.winner === 'TIE' ? 'text-lime-400' : 'text-slate-400'}`}>{cat.userScore.toFixed(1)}</span>
              <span className={`text-center font-black text-xl ${cat.winner === 'IdeaGPT' || cat.winner === 'TIE' ? 'text-lime-400' : 'text-slate-400'}`}>{cat.aiScore.toFixed(1)}</span>
            </div>
          ))}
        </div>
        <div className="mt-8 flex gap-4 justify-center">
          <button onClick={handleReset} className="px-8 py-3 bg-slate-700 text-slate-100 font-bold rounded-lg hover:bg-slate-600 transition-all">Play Again</button>
          <button onClick={() => setGameState(GameState.Review)} className="px-8 py-3 bg-lime-500 text-slate-900 font-bold rounded-lg hover:bg-lime-400 transition-all">Review Answers</button>
        </div>
      </div>
    </div>
  );
});

const FusionResultScreen = React.memo(({ fusionResult, handleReset }: { fusionResult: string | null; handleReset: () => void; }) => {
  if (!fusionResult) return null;
  
  const lines = fusionResult.split('\n').filter(line => line.trim() !== '');
  const title = lines.find(l => l.startsWith('### '))?.replace('### ', '') || 'Fused Idea';
  const slogan = lines.find(l => l.startsWith('**Slogan:**'))?.replace('**Slogan:**', '').trim() || '';
  
  const bigIdeaIndex = lines.findIndex(l => l.toLowerCase().includes('the big idea'));
  const briefIndex = lines.findIndex(l => l.toLowerCase().includes('business brief'));
  const finalPitchIndex = lines.findIndex(l => l.toLowerCase().includes('final pitch'));

  const getSectionContent = (start: number, end: number) => lines.slice(start + 1, end).join('\n').trim();

  const bigIdea = bigIdeaIndex !== -1 ? getSectionContent(bigIdeaIndex, briefIndex > -1 ? briefIndex : lines.length) : '';
  const brief = briefIndex !== -1 ? getSectionContent(briefIndex, finalPitchIndex > -1 ? finalPitchIndex : lines.length) : '';
  const finalPitch = finalPitchIndex !== -1 ? getSectionContent(finalPitchIndex, lines.length) : '';
  
  return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-3xl text-center">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">Fusion Complete!</h1>
              <p className="mt-2 text-lg text-slate-400">The Merger Maestro has spoken. Behold, your new creation:</p>
              <div className="mt-8 text-left bg-slate-800 p-8 rounded-xl border border-slate-700 space-y-6">
                  <h2 className="text-3xl font-bold text-center">{title}</h2>
                  {slogan && <p className="text-center text-cyan-400 italic text-xl">"{slogan}"</p>}
                  
                  {bigIdea && <div>
                      <h3 className="font-bold text-lg text-slate-300 border-b border-slate-600 pb-1 mb-2">The Big Idea</h3>
                      <p className="text-slate-400 whitespace-pre-wrap">{bigIdea}</p>
                  </div>}

                  {brief && <div>
                      <h3 className="font-bold text-lg text-slate-300 border-b border-slate-600 pb-1 mb-2">Business Brief</h3>
                      <p className="text-slate-400 whitespace-pre-wrap">{brief}</p>
                  </div>}

                  {finalPitch && <div>
                      <h3 className="font-bold text-lg text-slate-300 border-b border-slate-600 pb-1 mb-2">Final Pitch</h3>
                      <p className="text-slate-400 font-bold whitespace-pre-wrap">{finalPitch}</p>
                  </div>}
              </div>
              <button onClick={handleReset} className="mt-8 px-10 py-4 bg-cyan-500 text-slate-900 font-bold rounded-lg hover:bg-cyan-400 transition-all transform hover:scale-105">Create Another Abomination</button>
          </div>
      </div>
  );
});

const ReviewScreen = React.memo(({ challenges, userAnswers, aiAnswers, setGameState }: { challenges: string[]; userAnswers: string[]; aiAnswers: string[]; setGameState: (state: GameState) => void; }) => (
  <div className="p-4 md:p-8">
    <h1 className="text-4xl font-black text-center mb-8">Answer Review</h1>
    <div className="space-y-8 max-w-6xl mx-auto">
      {challenges.map((challenge, index) => (
        <div key={index} className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <p className="font-bold text-lg text-slate-300 mb-4">Round {index + 1}: <span className="font-medium text-slate-400">{challenge}</span></p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/70 p-4 rounded-lg">
              <h3 className="font-bold text-lime-400 mb-2">Your Answer</h3>
              <p className="text-slate-300 whitespace-pre-wrap">{userAnswers[index] || "No answer given."}</p>
            </div>
            <div className="bg-slate-900/70 p-4 rounded-lg">
              <h3 className="font-bold text-rose-400 mb-2">IdeaGPT's Answer</h3>
              <p className="text-slate-300 whitespace-pre-wrap">{aiAnswers[index]}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
    <div className="text-center mt-8">
      <button onClick={() => setGameState(GameState.Results)} className="px-8 py-3 bg-slate-700 text-slate-100 font-bold rounded-lg hover:bg-slate-600 transition-all">Back to Results</button>
    </div>
  </div>
));

const ErrorScreen = React.memo(({ error, handleReset }: { error: string | null; handleReset: () => void; }) => (
  <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
    <h1 className="text-4xl font-bold text-rose-500">An Error Occurred</h1>
    <p className="mt-4 text-lg text-slate-400 max-w-xl">{error}</p>
    <button onClick={handleReset} className="mt-8 px-8 py-3 bg-slate-700 text-slate-100 font-bold rounded-lg hover:bg-slate-600 transition-all">Try Again</button>
  </div>
));


// --- APP STATE & LOGIC ---

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.Welcome);
  const [gameMode, setGameMode] = useState<'Battle' | 'Fusion' | null>(null);
  const [challenges, setChallenges] = useState<string[]>([]);
  const [baseIdea, setBaseIdea] = useState<string>('');
  const [round, setRound] = useState(0);
  const [timer, setTimer] = useState(ROUND_DURATION_SECONDS);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [aiAnswers, setAiAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [fusionResult, setFusionResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shuffledChallenges = useMemo(() => {
    const seenChallenges = new Set(JSON.parse(localStorage.getItem('seenChallenges') || '[]'));
    const unseen = CHALLENGES.filter(c => !seenChallenges.has(c));
    
    if (unseen.length < TOTAL_ROUNDS) {
      localStorage.removeItem('seenChallenges');
      return [...CHALLENGES].sort(() => 0.5 - Math.random()).slice(0, TOTAL_ROUNDS);
    }
    
    return unseen.sort(() => 0.5 - Math.random()).slice(0, TOTAL_ROUNDS);
  }, []);

  const handleStartGame = useCallback((mode: 'Battle' | 'Fusion') => {
    setGameMode(mode);
    let chosenChallenges: string[];
    
    if (mode === 'Battle') {
      chosenChallenges = shuffledChallenges;
      const seen = new Set(JSON.parse(localStorage.getItem('seenChallenges') || '[]'));
      chosenChallenges.forEach(c => seen.add(c));
      localStorage.setItem('seenChallenges', JSON.stringify(Array.from(seen)));
    } else { // Fusion Mode
      chosenChallenges = FUSION_CHALLENGE_TEMPLATES;
      const idea = FUSION_BASE_CONCEPTS[Math.floor(Math.random() * FUSION_BASE_CONCEPTS.length)];
      setBaseIdea(idea);
    }
    
    setChallenges(chosenChallenges);
    setGameState(GameState.Playing);
    setRound(0);
    setTimer(ROUND_DURATION_SECONDS);
    setUserAnswers(Array(TOTAL_ROUNDS).fill(''));
    setAiAnswers(Array(TOTAL_ROUNDS).fill(''));
    setCurrentAnswer('');
    setEvaluationResult(null);
    setFusionResult(null);
    setError(null);
  }, [shuffledChallenges]);

  const handleRoundSubmit = useCallback(async () => {
    setGameState(GameState.Submitting);

    const newUserAnswers = [...userAnswers];
    newUserAnswers[round] = currentAnswer;
    setUserAnswers(newUserAnswers);

    try {
      let aiPrompt = challenges[round];
      if (gameMode === 'Fusion') {
        aiPrompt = aiPrompt.replace('{{IDEA}}', baseIdea);
        if (round > 0 && aiAnswers[0]) {
          aiPrompt = aiPrompt.replace(/\{\{NAME\}\}/g, aiAnswers[0]);
        }
      }

      const aiResponse = await getAiResponse(aiPrompt);
      const newAiAnswers = [...aiAnswers];
      newAiAnswers[round] = aiResponse;
      setAiAnswers(newAiAnswers);

      if (round < TOTAL_ROUNDS - 1) {
        setRound(r => r + 1);
        setCurrentAnswer('');
        setTimer(ROUND_DURATION_SECONDS);
        setGameState(GameState.Playing);
      } else {
        if (gameMode === 'Battle') {
          setGameState(GameState.Evaluating);
        } else if (gameMode === 'Fusion') {
          setGameState(GameState.Fusing);
        }
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred while fetching the AI response.");
      setGameState(GameState.Error);
    }
  }, [round, currentAnswer, userAnswers, aiAnswers, challenges, gameMode, baseIdea]);

  const handleReset = useCallback(() => {
    setGameState(GameState.Welcome);
    setGameMode(null);
  }, []);

  // Timer effect
  useEffect(() => {
    if (gameState === GameState.Playing) {
      if (timer > 0) {
        const countdown = setInterval(() => {
          setTimer(t => t - 1);
        }, 1000);
        return () => clearInterval(countdown);
      } else {
        handleRoundSubmit();
      }
    }
  }, [gameState, timer, handleRoundSubmit]);
  
  // Evaluation effect (Battle Mode)
  useEffect(() => {
    if (gameState === GameState.Evaluating) {
      const performEvaluation = async () => {
        try {
          const result = await evaluateAnswers(challenges, userAnswers, aiAnswers);
          setEvaluationResult(result);
          setGameState(GameState.Results);
        } catch (e: any) {
          setError(e.message || "Failed to evaluate answers.");
          setGameState(GameState.Error);
        }
      };
      performEvaluation();
    }
  }, [gameState, challenges, userAnswers, aiAnswers]);

  // Fusion effect (Fusion Mode)
  useEffect(() => {
    if (gameState === GameState.Fusing) {
        const performFusion = async () => {
            try {
                // For fusion, userAnswers needs to be updated with the last answer
                const finalUserAnswers = [...userAnswers];
                finalUserAnswers[round] = currentAnswer;
                
                const result = await getFusedIdea(finalUserAnswers, aiAnswers);
                setFusionResult(result);
                setGameState(GameState.FusionResult);
            } catch (e: any) {
                setError(e.message || "Failed to fuse ideas.");
                setGameState(GameState.Error);
            }
        };
        performFusion();
    }
  }, [gameState, userAnswers, aiAnswers, round, currentAnswer]);

  const renderContent = () => {
    switch (gameState) {
      case GameState.Welcome:
        return <WelcomeScreen handleStartGame={handleStartGame} />;
      case GameState.Playing:
        return <PlayingScreen 
          round={round}
          gameMode={gameMode}
          challengeTemplate={challenges[round]}
          baseIdea={baseIdea}
          userAnswers={userAnswers}
          currentAnswer={currentAnswer}
          timer={timer}
          handleRoundSubmit={handleRoundSubmit}
          setCurrentAnswer={setCurrentAnswer}
        />;
      case GameState.Submitting:
        return <LoadingScreen message="Submitting..." />;
      case GameState.Evaluating:
        return <LoadingScreen message="The judges are conferring..." />;
      case GameState.Results:
        return <ResultsScreen 
          evaluationResult={evaluationResult}
          handleReset={handleReset}
          setGameState={setGameState}
        />;
      case GameState.Review:
        return <ReviewScreen 
          challenges={challenges}
          userAnswers={userAnswers}
          aiAnswers={aiAnswers}
          setGameState={setGameState}
        />;
      case GameState.Fusing:
        return <LoadingScreen message="Engaging the Merger Maestro..." />;
      case GameState.FusionResult:
        return <FusionResultScreen fusionResult={fusionResult} handleReset={handleReset} />;
      case GameState.Error:
        return <ErrorScreen error={error} handleReset={handleReset} />;
      default:
        return <WelcomeScreen handleStartGame={handleStartGame} />;
    }
  };

  return <main className="bg-slate-900 text-slate-100 min-h-screen font-sans">{renderContent()}</main>;
}
