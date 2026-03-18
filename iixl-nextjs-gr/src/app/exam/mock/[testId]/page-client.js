"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { TEST_SERIES, EXAM_CATEGORIES } from "../../mock-data";

const DEFAULT_DURATION = 2 * 60 * 60;

const mockQuestions = [
  {
    id: "Q101",
    category: "General Awareness",
    question: "Which Article of the Constitution of India guarantees equality before the law?",
    options: ["Article 12", "Article 14", "Article 19", "Article 21"],
    correctAnswer: 1,
  },
  {
    id: "Q102",
    category: "Quantitative Aptitude",
    question: "If 18% of a number is 72, what is the number?",
    options: ["360", "380", "400", "420"],
    correctAnswer: 2,
  },
  {
    id: "Q103",
    category: "General Awareness",
    question: "Who was the first woman Governor of an Indian state?",
    options: ["Sarojini Naidu", "Sucheta Kriplani", "Indira Gandhi", "Vijaya Lakshmi Pandit"],
    correctAnswer: 0,
  },
  {
    id: "Q104",
    category: "Quantitative Aptitude",
    question: "A train covers 240 km in 4 hours. What is its average speed?",
    options: ["55 km/h", "60 km/h", "65 km/h", "70 km/h"],
    correctAnswer: 1,
  },
  {
    id: "Q105",
    category: "General Awareness",
    question: "The headquarters of UNESCO is located in which city?",
    options: ["Geneva", "Paris", "New York", "Vienna"],
    correctAnswer: 1,
  },
  {
    id: "Q106",
    category: "Quantitative Aptitude",
    question: "What is the simple interest on Rs. 5,000 at 8% per annum for 3 years?",
    options: ["Rs. 1,000", "Rs. 1,200", "Rs. 1,400", "Rs. 1,600"],
    correctAnswer: 1,
  },
  {
    id: "Q107",
    category: "General Awareness",
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Jupiter", "Mars", "Mercury"],
    correctAnswer: 2,
  },
  {
    id: "Q108",
    category: "Quantitative Aptitude",
    question: "The ratio of boys to girls in a class is 7:5. If there are 42 boys, how many girls are there?",
    options: ["28", "30", "32", "35"],
    correctAnswer: 1,
  },
  {
    id: "Q109",
    category: "General Awareness",
    question: "The Battle of Plassey was fought in which year?",
    options: ["1757", "1761", "1857", "1947"],
    correctAnswer: 0,
  },
  {
    id: "Q110",
    category: "Quantitative Aptitude",
    question: "What is 15% of 860?",
    options: ["119", "129", "139", "149"],
    correctAnswer: 1,
  },
  {
    id: "Q111",
    category: "General Awareness",
    question: "Who authored the book 'Discovery of India'?",
    options: ["Dr. B. R. Ambedkar", "Jawaharlal Nehru", "Mahatma Gandhi", "Rabindranath Tagore"],
    correctAnswer: 1,
  },
  {
    id: "Q112",
    category: "Quantitative Aptitude",
    question: "A shopkeeper gives a 10% discount on an item marked Rs. 750. What is the selling price?",
    options: ["Rs. 650", "Rs. 675", "Rs. 700", "Rs. 725"],
    correctAnswer: 1,
  },
  {
    id: "Q113",
    category: "General Awareness",
    question: "Which river is known as the sorrow of Bihar?",
    options: ["Kosi", "Gandak", "Son", "Mahananda"],
    correctAnswer: 0,
  },
  {
    id: "Q114",
    category: "Quantitative Aptitude",
    question: "If the perimeter of a square is 48 cm, what is the area?",
    options: ["121 sq cm", "132 sq cm", "144 sq cm", "156 sq cm"],
    correctAnswer: 2,
  },
  {
    id: "Q115",
    category: "General Awareness",
    question: "Which constitutional body conducts elections in India?",
    options: ["Finance Commission", "Planning Commission", "Election Commission", "Union Public Service Commission"],
    correctAnswer: 2,
  },
  {
    id: "Q116",
    category: "Quantitative Aptitude",
    question: "What is the least common multiple of 12 and 18?",
    options: ["24", "30", "36", "48"],
    correctAnswer: 2,
  },
  {
    id: "Q117",
    category: "General Awareness",
    question: "Which Indian state has the longest coastline?",
    options: ["Tamil Nadu", "Kerala", "Gujarat", "Andhra Pradesh"],
    correctAnswer: 2,
  },
  {
    id: "Q118",
    category: "Quantitative Aptitude",
    question: "If 3 workers can complete a job in 12 days, in how many days will 4 workers complete it at the same rate?",
    options: ["8 days", "9 days", "10 days", "16 days"],
    correctAnswer: 1,
  },
  {
    id: "Q119",
    category: "General Awareness",
    question: "The National Anthem of India was originally composed in which language?",
    options: ["Hindi", "Sanskrit", "Bengali", "Urdu"],
    correctAnswer: 2,
  },
  {
    id: "Q120",
    category: "Quantitative Aptitude",
    question: "A number increased by 25% becomes 250. What was the original number?",
    options: ["180", "190", "200", "210"],
    correctAnswer: 2,
  },
];

const createInitialAnswer = () => ({
  selectedOption: null,
  status: "not_visited", // "not_visited" | "visited" | "answered" | "marked" | "answered_marked"
  timeSpentSeconds: 0,
  switchedAnswer: false,
  lowConfidence: false,
});

function formatClock(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  const hours = String(Math.floor(safe / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((safe % 3600) / 60)).padStart(2, "0");
  const seconds = String(safe % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function getPaletteTone(status, isCurrent) {
  const base = "flex h-10 w-10 items-center justify-center text-[13px] font-black transition-all duration-200 rounded-md ";
  const active = isCurrent ? "ring-4 ring-blue-500 ring-offset-2 z-10 scale-105 " : "";
  
  switch(status) {
    case "not_visited": 
      return base + active + "bg-slate-200 text-slate-500 border border-slate-300";
    case "visited": 
      return base + active + "bg-slate-400 text-white border border-slate-500";
    case "answered": 
      return base + active + "bg-emerald-500 text-white shadow-md";
    case "marked": 
      return base + active + "bg-amber-400 text-white shadow-md";
    case "answered_marked": 
      return base + active + "bg-indigo-500 text-white shadow-md";
    default: 
      return base + active + "bg-slate-200 text-slate-500";
  }
}

function statusLabel(status) {
  switch(status) {
    case "not_visited": return "Not visited";
    case "visited": return "Visited";
    case "answered": return "Answered";
    case "marked": return "Marked for review";
    case "answered_marked": return "Answered & Marked";
    default: return "Not visited";
  }
}

function updateAnswerAt(answers, index, updater) {
  return answers.map((entry, currentIndex) => {
    if (currentIndex !== index) return entry;
    return updater(entry);
  });
}

function buildAdaptivePayload(answers, liveQuestionIndex, liveQuestionElapsed) {
  return answers.map((entry, index) => {
    const question = mockQuestions[index];
    const totalTimeSpent =
      entry.timeSpentSeconds + (index === liveQuestionIndex ? liveQuestionElapsed : 0);
    const isCorrect = entry.selectedOption === question.correctAnswer;

    let behavior = "Skipped";
    if (entry.selectedOption !== null) {
      behavior = isCorrect && totalTimeSpent >= 20 && totalTimeSpent <= 90 ? "Stable" : "Needs Review";
    }
    if (entry.lowConfidence) {
      behavior = "Low Confidence";
    }

    return {
      questionId: question.id,
      selectedOption:
        entry.selectedOption !== null
          ? String.fromCharCode(65 + entry.selectedOption)
          : null,
      timeSpentSeconds: totalTimeSpent,
      behavior,
      switchedAnswer: entry.switchedAnswer,
      wasMarkedForReview: entry.wasMarkedForReview,
    };
  });
}

export default function ExamInterfaceClient({ testId }) {
  // Find the test details from mock data
  const allTests = Object.values(TEST_SERIES).flat();
  const testInfo = allTests.find(t => t.id === testId) || { name: "Mock Exam", duration: 120 };
  
  const EXAM_DURATION_SECONDS = testInfo.duration * 60;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_SECONDS);
  const [userAnswers, setUserAnswers] = useState(() =>
    mockQuestions.map(() => createInitialAnswer())
  );
  const [questionElapsed, setQuestionElapsed] = useState(0);
  const [examElapsed, setExamElapsed] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [distractionEvents, setDistractionEvents] = useState([]);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [examStarted, setExamStarted] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const currentQuestion = mockQuestions[currentQuestionIndex];
  const currentAnswer = userAnswers[currentQuestionIndex];
  const sectionTabs = ["General Awareness", "Quantitative Aptitude"];

  useEffect(() => {
    setUserAnswers((previous) =>
      updateAnswerAt(previous, 0, (entry) => ({
        ...entry,
        status: "visited",
      }))
    );
  }, []);

  useEffect(() => {
    if (!examStarted) return;
    const timer = window.setInterval(() => {
      setTimeLeft((previous) => (previous > 0 ? previous - 1 : 0));
      setQuestionElapsed((previous) => previous + 1);
      setExamElapsed((previous) => previous + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [examStarted]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("Student left the tab! Log this as a 'Distraction Event'.");
        setDistractionEvents((previous) => [
          ...previous,
          {
            questionId: mockQuestions[currentQuestionIndex].id,
            atSecond: examElapsed,
          },
        ]);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [currentQuestionIndex, examElapsed]);

  useEffect(() => {
    if (timeLeft === 0) {
      handleFinish();
    }
  }, [timeLeft]);

  const summary = useMemo(() => {
    return userAnswers.reduce((acc, curr) => {
      acc[curr.status]++;
      if (curr.selectedOption !== null) acc.totalAnswered++;
      return acc;
    }, { 
      not_visited: 0, 
      visited: 0, 
      answered: 0, 
      marked: 0, 
      answered_marked: 0,
      totalAnswered: 0 
    });
  }, [userAnswers]);

  const resultSummary = useMemo(() => {
    const detailed = userAnswers.map((entry, index) => {
      const question = mockQuestions[index];
      const effectiveTime =
        entry.timeSpentSeconds + (index === currentQuestionIndex ? questionElapsed : 0);
      const isCorrect = entry.selectedOption === question.correctAnswer;
      return {
        index,
        question,
        entry,
        effectiveTime,
        isCorrect,
      };
    });

    const correct = detailed.filter((item) => item.isCorrect).length;
    const incorrect = detailed.filter(
      (item) => item.entry.selectedOption !== null && !item.isCorrect
    ).length;
    const unanswered = detailed.filter((item) => item.entry.selectedOption === null).length;
    const accuracy = summary.totalAnswered === 0 ? 0 : Math.round((correct / summary.totalAnswered) * 100);

    return {
      detailed,
      correct,
      incorrect,
      unanswered,
      accuracy,
    };
  }, [currentQuestionIndex, questionElapsed, summary.totalAnswered, userAnswers]);

  function commitTimeToCurrentQuestion() {
    setUserAnswers((previous) =>
      updateAnswerAt(previous, currentQuestionIndex, (entry) => ({
        ...entry,
        timeSpentSeconds: entry.timeSpentSeconds + questionElapsed,
      }))
    );
  }

  function visitQuestion(index) {
    setUserAnswers((previous) =>
      updateAnswerAt(previous, index, (entry) => ({
        ...entry,
        status: entry.status === "not_visited" ? "visited" : entry.status,
      }))
    );
  }

  function navigateToQuestion(nextIndex) {
    commitTimeToCurrentQuestion();
    setCurrentQuestionIndex(nextIndex);
    visitQuestion(nextIndex);
    setQuestionElapsed(0);
  }

  const [saveMessage, setSaveMessage] = useState(null);
  function showSaveFeedback() {
    setSaveMessage("Saved");
    setTimeout(() => setSaveMessage(null), 2000);
  }

  function handleSelectOption(optionIndex) {
    setUserAnswers((previous) =>
      updateAnswerAt(previous, currentQuestionIndex, (entry) => {
        const newSelectedOption = entry.selectedOption === optionIndex ? null : optionIndex;
        let newStatus = entry.status;
        
        if (newSelectedOption !== null) {
          // Rule: Instant update to answered OR answered_marked
          newStatus = (entry.status === "marked" || entry.status === "answered_marked") ? "answered_marked" : "answered";
        } else {
          newStatus = (entry.status === "marked" || entry.status === "answered_marked") ? "marked" : "visited";
        }

        return {
          ...entry,
          selectedOption: newSelectedOption,
          status: newStatus,
          switchedAnswer: entry.selectedOption !== null && entry.selectedOption !== optionIndex ? true : entry.switchedAnswer,
        };
      })
    );
    showSaveFeedback();
  }

  function handlePrevious() {
    if (currentQuestionIndex === 0) return;
    navigateToQuestion(currentQuestionIndex - 1);
  }

  // Keyboard Navigation
  // Keyboard Navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!examStarted || resultsOpen) return;
      
      // Options 1-4
      if (["1", "2", "3", "4"].includes(e.key)) {
        handleSelectOption(parseInt(e.key) - 1);
      }
      
      // Enter -> Save & Next
      if (e.key === "Enter") {
        handleSaveAndNext();
      }

      if (e.key === "ArrowRight") {
        const next = Math.min(currentQuestionIndex + 1, mockQuestions.length - 1);
        if (next !== currentQuestionIndex) navigateToQuestion(next);
      } else if (e.key === "ArrowLeft") {
        const prev = Math.max(0, currentQuestionIndex - 1);
        if (prev !== currentQuestionIndex) navigateToQuestion(prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [examStarted, resultsOpen, currentQuestionIndex, userAnswers]);

   const progressPercentage = (summary.totalAnswered / mockQuestions.length) * 100;

  function handleSaveAndNext() {
    setUserAnswers(prev => updateAnswerAt(prev, currentQuestionIndex, (entry) => {
      if (entry.selectedOption !== null) {
        return { ...entry, status: (entry.status === "marked" || entry.status === "answered_marked") ? "answered_marked" : "answered" };
      }
      return { ...entry, status: "visited" };
    }));
    const nextIndex = Math.min(currentQuestionIndex + 1, mockQuestions.length - 1);
    navigateToQuestion(nextIndex);
  }

  function handleClearResponse() {
    setUserAnswers((previous) =>
      updateAnswerAt(previous, currentQuestionIndex, (entry) => ({
        ...entry,
        selectedOption: null,
        status: "visited",
      }))
    );
  }

  function handleMarkForReview() {
    setUserAnswers((previous) =>
      updateAnswerAt(previous, currentQuestionIndex, (entry) => ({
        ...entry,
        status: entry.selectedOption !== null ? "answered_marked" : "marked",
      }))
    );
    const nextIndex = Math.min(currentQuestionIndex + 1, mockQuestions.length - 1);
    navigateToQuestion(nextIndex);
  }

  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  function handleFinish() {
    setSubmitModalOpen(true);
  }

  function confirmFinish() {
    const payload = buildAdaptivePayload(
      userAnswers,
      currentQuestionIndex,
      questionElapsed
    );
    console.table(payload);
    setSubmitModalOpen(false);
    setResultsOpen(true);
  }

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const timerDanger = timeLeft < 5 * 60;

  if (!examStarted) {
    return (
      <main className="min-h-screen bg-[#f3f4f6] p-4 text-slate-800">
        <div className="mx-auto max-w-5xl rounded-lg border border-slate-300 bg-white shadow-lg overflow-hidden">
          <div className="bg-[#1a5fb4] px-8 py-5 text-white flex items-center justify-between">
             <h1 className="text-2xl font-black uppercase tracking-tight">Instructions</h1>
             <div className="text-right">
                <p className="text-[10px] font-black opacity-60 uppercase tracking-widest leading-none mb-1">Target Exam</p>
                <p className="text-sm font-black whitespace-nowrap">{testInfo.name}</p>
             </div>
          </div>
          
          <div className="p-8 max-h-[70vh] overflow-y-auto space-y-8 text-sm leading-relaxed">
             <section className="space-y-4">
               <h2 className="text-xl font-bold border-b border-slate-200 pb-2">General Instructions:</h2>
               <div className="space-y-3">
                 <p className="font-bold underline">Answering a Question:</p>
                 <ol className="list-decimal pl-6 space-y-2">
                   <li>
                     <strong>Answering a Question:</strong>
                     <ul className="list-[lower-alpha] pl-6 mt-1 space-y-1">
                       <li>To select your answer, click on the button of one of the options.</li>
                       <li>To deselect your chosen answer, click on the button of the chosen option again or click on the <strong>Clear Response</strong> button.</li>
                       <li>To change your chosen answer, click on the button of another option.</li>
                       <li>To save your answer, you <strong>MUST</strong> click on the <strong>Save & Next</strong> button.</li>
                       <li>To mark the question for review, click on the <strong>Mark for Review & Next</strong> button.</li>
                     </ul>
                   </li>
                   <li>To change your answer to a question that has already been answered, first select that question for answering and then follow the procedure for answering that type of question.</li>
                 </ol>
               </div>
             </section>

             <section className="space-y-4">
               <h2 className="text-xl font-bold border-b border-slate-200 pb-2">Navigation:</h2>
               <div className="space-y-3">
                 <p className="font-bold underline">Navigating to a Question:</p>
                 <ul className="list-disc pl-6 space-y-2">
                   <li>To answer a question, click on the question number in the Question Palette at the right of your screen to go to that numbered question directly. <strong>Note:</strong> Using this option does NOT save your answer to the current question.</li>
                   <li>Click on <strong>Save & Next</strong> to save your answer for the current question and then go to the next question.</li>
                   <li>Click on <strong>Mark for Review & Next</strong> to save your answer for the current question, mark it for review, and then go to the next question.</li>
                 </ul>
                 
                 <p className="font-bold underline mt-6 italic">Navigating through Sections:</p>
                 <ol className="list-decimal pl-6 space-y-1">
                   <li>Sections are displayed on the top bar. You can view them by clicking the section name.</li>
                   <li>After clicking the Save & Next button on the last question of a section, you will automatically be taken to the first question of the next section.</li>
                   <li>You can shuffle between sections and questions anytime.</li>
                 </ol>
               </div>
             </section>

             <section className="space-y-4">
               <h2 className="text-xl font-bold border-b border-slate-200 pb-2">Information:</h2>
               <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <p className="font-bold underline">Timer & Progress:</p>
                    <p>The countdown timer (Time Left) is visible at the top right. Use it positively to phase your answering.</p>
                    <p className="font-bold underline mt-4">Rough Sheets:</p>
                    <p>Rough sheets will be provided. Do not worry about this part.</p>
                  </div>
                  <div className="space-y-3">
                    <p className="font-bold underline text-indigo-700">Palette Colour Scheme:</p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <span className="h-4 w-4 bg-white border border-slate-300 rounded shadow-sm"></span>
                        <span><strong>White:</strong> Not Visited</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-4 w-4 bg-[#ff4d4d] rounded-t-sm rounded-b-lg"></span>
                        <span><strong>Red:</strong> Visited but not Answered</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-4 w-4 bg-[#2d8cff] rounded-lg"></span>
                        <span><strong>Blue/Green:</strong> Answered</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="h-4 w-4 bg-violet-600 rounded-full"></span>
                        <span><strong>Purple:</strong> Marked for Review</span>
                      </li>
                    </ul>
                  </div>
               </div>
             </section>
          </div>

          <div className="bg-slate-50 px-8 py-5 border-t border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase transition-all duration-200">
               <input 
                 type="checkbox" 
                 id="agree" 
                 className="h-5 w-5 rounded border-slate-300 text-[#1a5fb4] focus:ring-[#1a5fb4]" 
                 checked={agreed}
                 onChange={(e) => setAgreed(e.target.checked)}
               />
               <label htmlFor="agree" className="cursor-pointer select-none">I have read and understood the instructions</label>
            </div>
            <button
              onClick={() => {
                if (!agreed) {
                  alert("Please read and agree to the instructions first!");
                  return;
                }
                setExamStarted(true);
              }}
              className={`bg-[#1a5fb4] text-white px-10 py-3 rounded-md font-bold uppercase transition-all duration-300 shadow-lg active:scale-95 ${
                !agreed 
                  ? "opacity-50 grayscale cursor-not-allowed transform scale-[0.98]" 
                  : "hover:bg-blue-800 hover:shadow-blue-200"
              }`}
            >
              Start Online Test
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f1f4f9] text-slate-900 selection:bg-blue-100 flex flex-col">
      <div className="mx-auto flex flex-1 w-full max-w-[1440px] flex-col bg-white shadow-2xl overflow-hidden relative">
          
          <header className="bg-white px-4 md:px-8 py-3 md:py-4 border-b-4 border-blue-600 shadow-md sticky top-0 z-[100]">
            <div className="flex items-center justify-between md:grid md:grid-cols-3 md:items-center">
              
              {/* Desktop Left: Branding */}
              <div className="hidden md:flex items-center gap-3">
                <Link href="/exam" className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white font-black text-2xl shadow-inner hover:bg-blue-700 transition-colors">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7"/></svg>
                </Link>
                <div className="leading-none">
                  <p className="text-blue-700 text-xl font-black tracking-tight uppercase" id="exam-title">{testInfo.name.split(' ')[0]} SESSION</p>
                  <div className="mt-1 flex items-center gap-2">
                     <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live</p>
                  </div>
                </div>
              </div>

              {/* Mobile Left/Center: Current Question Category */}
              <div className="flex md:hidden items-center gap-2">
                <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded">Q{currentQuestionIndex + 1}</span>
                <p className="text-slate-800 font-black text-[11px] uppercase tracking-wider truncate max-w-[120px]">
                  {currentQuestion.category}
                </p>
              </div>

              {/* Desktop Center: Progress Bar */}
              <div className="hidden md:block px-10">
                 <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                   <span>Overall Progress</span>
                   <span className="text-blue-600 font-bold">{summary.totalAnswered} / {mockQuestions.length}</span>
                 </div>
                 <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${progressPercentage}%` }}
                     className="h-full bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                   />
                 </div>
              </div>
              
              {/* Right Area: Timer & Mobile Menu */}
              <div className="flex items-center justify-end gap-3 md:gap-6">
                <AnimatePresence>
                  {saveMessage && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8, x: 20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="hidden sm:flex bg-emerald-500 text-white px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest shadow-lg items-center gap-1.5"
                    >
                      <svg className="h-2 w-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7"/></svg>
                      Saved
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center gap-2 md:gap-3 bg-slate-900 px-3 md:px-5 py-2 md:py-2.5 rounded-xl shadow-2xl border border-white/10 group">
                   <span className={`font-mono text-base md:text-2xl font-black leading-none tracking-tight transition-all ${
                     timerDanger ? "text-rose-500 animate-pulse" : "text-white"
                   }`}>
                     {formatClock(timeLeft)}
                   </span>
                   <div className="h-6 w-6 md:h-8 md:w-8 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center shrink-0">
                      <svg className="h-4 w-4 md:h-5 md:w-5 text-white/40 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   </div>
                </div>

                {/* Mobile Menu Toggle */}
                <button 
                  onClick={() => setDrawerOpen(true)}
                  className="xl:hidden flex items-center justify-center h-9 w-9 md:h-11 md:w-11 bg-slate-100 hover:bg-blue-600 group transition-all rounded-xl active:scale-90"
                  id="mobile-menu-btn"
                >
                  <svg className="h-5 w-5 text-slate-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16m-7 6h7"/></svg>
                </button>
              </div>
            </div>
          </header>
          {/* Navigation Bar: Scrollable on Mobile */}
          <div className="bg-[#004a99] flex items-center px-4 md:px-6 overflow-x-auto no-scrollbar">
               <div className="flex h-full gap-1 items-center">
                 {sectionTabs.map((tab) => {
                   const active = tab === currentQuestion.category;
                   return (
                     <button
                       key={tab}
                       onClick={() => {
                         const firstIdxOfCat = mockQuestions.findIndex(q => q.category === tab);
                         if (firstIdxOfCat !== -1) navigateToQuestion(firstIdxOfCat);
                       }}
                       className={`px-4 md:px-6 py-2 md:py-2.5 text-[10px] md:text-[11px] font-black uppercase tracking-wider transition-all rounded-t-lg relative mt-2 md:mt-2.5 whitespace-nowrap ${
                         active 
                           ? "bg-white text-[#004a99]" 
                           : "text-white/70 hover:text-white hover:bg-white/10"
                       }`}
                     >
                       {tab}
                       {active && <div className="absolute -bottom-1 left-0 right-0 h-2 bg-white" />}
                     </button>
                   );
                 })}
               </div>
             </div>

        <div className="flex flex-1 overflow-hidden">
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-1 flex-col border-r border-slate-100 bg-white"
          >
            <div className="flex-1 overflow-y-auto px-4 md:px-10 py-6 md:py-10">

              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="max-w-4xl"
              >
                <div className="mb-6 md:mb-10 flex flex-wrap items-center gap-3 md:gap-4 border-b border-slate-100 pb-4 md:pb-6">
                   <div className="flex items-center gap-2">
                     <span className="bg-[#1a5fb4] text-white text-[10px] md:text-xs font-black px-2.5 md:px-3 py-1.5 rounded-lg shadow-sm uppercase tracking-[0.05em] transition-transform active:scale-95">Q {currentQuestionIndex + 1}</span>
                     <div className="h-4 w-[1px] bg-slate-200 mx-1 md:mx-2" />
                     <span className="text-slate-500 text-[10px] md:text-sm font-black uppercase tracking-[0.15em]">{currentQuestion.category}</span>
                   </div>
                   <div className="hidden sm:block h-1.5 w-1.5 rounded-full bg-slate-200" />
                   <span className="bg-emerald-50 text-emerald-600 text-[10px] md:text-xs font-black px-3 py-1.5 rounded-full ring-1 ring-emerald-200/50 uppercase tracking-widest shadow-[0_2px_10px_-4px_rgba(16,185,129,0.1)]">+4 / -1 Mark</span>
                </div>
                
                <div className="mb-8 md:mb-14">
                  <h2 className="text-xl md:text-3xl font-black leading-snug text-slate-800 tracking-tight">
                    {currentQuestion.question}
                  </h2>
                </div>

                <div className="grid gap-3 md:gap-5">
                  {currentQuestion.options.map((option, optionIndex) => {
                    const isSelected = currentAnswer.selectedOption === optionIndex;
                    return (
                      <label 
                        key={option} 
                        className={`group relative flex items-center gap-4 md:gap-8 cursor-pointer p-4 md:p-6 rounded-xl md:rounded-2xl border-2 transition-all active:scale-[0.99] ${
                          isSelected 
                            ? "border-blue-600 bg-blue-50/50 shadow-md ring-1 ring-blue-600/30" 
                            : "border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50 shadow-sm"
                        }`}
                      >
                         <div className={`h-10 w-10 md:h-12 md:w-12 shrink-0 flex items-center justify-center rounded-lg md:rounded-xl border-2 transition-all ${
                            isSelected ? "bg-blue-600 border-blue-600 shadow-lg" : "bg-slate-50 border-slate-200 group-hover:border-blue-300"
                         }`}>
                           <span className={`text-base md:text-lg font-black ${isSelected ? "text-white" : "text-slate-400 group-hover:text-blue-500"}`}>
                             {String.fromCharCode(65 + optionIndex)}
                           </span>
                         </div>
                         <div className="flex items-center flex-1 justify-between gap-4 md:gap-10">
                            <p className={`text-base md:text-xl font-bold transition-colors ${isSelected ? "text-blue-900" : "text-slate-700 group-hover:text-slate-900"}`}>
                              {option}
                            </p>
                            {isSelected && (
                              <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow-lg"
                              >
                                <svg className="h-4 w-4 md:h-5 md:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7"/></svg>
                              </motion.div>
                            )}
                         </div>
                         <input
                            type="radio"
                            className="hidden"
                            checked={isSelected}
                            onChange={() => handleSelectOption(optionIndex)}
                          />
                      </label>
                    );
                  })}
                </div>
              </motion.div>
            </div>

            <footer className="sticky bottom-0 z-50 border-t border-slate-200 bg-white shadow-lg">
              <div className="flex flex-col md:flex-row items-center justify-between px-4 md:px-10 py-4 md:py-5 bg-slate-50/50 gap-4">
                <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={handleMarkForReview}
                    className="flex-1 md:flex-none bg-white border-2 border-[#004a99] text-[#004a99] px-4 md:px-8 py-3 md:py-3.5 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#004a99] hover:text-white transition-all shadow-sm active:scale-95"
                  >
                    Mark for Review
                  </button>
                  <button
                    type="button"
                    onClick={handleClearResponse}
                    className="flex-1 md:flex-none bg-white border-2 border-slate-300 text-slate-500 px-4 md:px-8 py-3 md:py-3.5 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl hover:border-slate-400 hover:text-slate-600 transition-all shadow-sm active:scale-95"
                  >
                    Clear
                  </button>
                </div>

                <div className="flex items-center gap-3 md:gap-8 w-full md:w-auto">
                  <button
                    onClick={handleFinish}
                    className="flex-1 md:flex-none border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-4 md:px-10 py-3 md:py-3.5 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all active:scale-95"
                  >
                    SUBMIT
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAndNext}
                    className="flex-[2] md:flex-none bg-[#5aa338] text-white px-6 md:px-12 py-3.5 md:py-4 text-xs md:text-sm font-black uppercase tracking-widest md:tracking-[0.2em] rounded-xl shadow-lg shadow-emerald-900/10 hover:bg-emerald-600 transition-all active:scale-95 ring-4 ring-emerald-50"
                  >
                    Save & Next
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 px-4 md:px-10 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3 w-full justify-between sm:justify-start">
                   <button
                    onClick={handlePrevious}
                    disabled={currentQuestionIndex === 0}
                    className="bg-white/10 border border-white/20 text-white px-4 md:px-6 py-2 md:py-2.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-lg transition-all hover:bg-white/20 disabled:opacity-20 flex items-center gap-1.5"
                  >
                    <svg className="h-3 w-3 md:h-4 md:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7"/></svg>
                    PREV
                  </button>
                  <button
                    onClick={handleSaveAndNext}
                    disabled={currentQuestionIndex === mockQuestions.length - 1}
                    className="bg-white/10 border border-white/20 text-white px-4 md:px-6 py-2 md:py-2.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-lg transition-all hover:bg-white/20 disabled:opacity-20 flex items-center gap-1.5"
                  >
                    NEXT
                    <svg className="h-3 w-3 md:h-4 md:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7"/></svg>
                  </button>
                </div>
                
                <div className="hidden sm:flex items-center gap-2">
                   <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[10px] text-white/50 font-black uppercase tracking-[0.2em]">Secure Session Active</span>
                </div>
              </div>
            </footer>
          </motion.section>

          {/* Sidebar Palette: Desktop Only */}
          <aside className="hidden xl:flex w-[340px] flex-col bg-slate-50/80 border-l border-slate-200 backdrop-blur-sm">
            <PalettePanel
              currentQuestionIndex={currentQuestionIndex}
              userAnswers={userAnswers}
              summary={summary}
              onQuestionSelect={navigateToQuestion}
            />
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {drawerOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close question palette overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/55 xl:hidden"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="fixed inset-y-0 right-0 z-50 w-[88vw] max-w-sm bg-white p-4 text-slate-900 shadow-2xl xl:hidden"
            >
              <div className="mb-4 flex items-center justify-between px-2">
                <p className="text-xl font-black uppercase tracking-widest text-[#1a5fb4]">Menu</p>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  Close
                </button>
              </div>
              <PalettePanel
                currentQuestionIndex={currentQuestionIndex}
                userAnswers={userAnswers}
                summary={summary}
                onQuestionSelect={(index) => {
                  navigateToQuestion(index);
                  setDrawerOpen(false);
                }}
              />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {resultsOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close results overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setResultsOpen(false)}
              className="fixed inset-0 z-50 bg-slate-950/60"
            />
            <motion.section
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              className="fixed inset-x-2 top-2 z-[60] mx-auto max-h-[calc(100vh-1rem)] max-w-6xl overflow-hidden rounded-2xl border border-slate-300 bg-white/95 backdrop-blur-xl shadow-[0_40px_100px_-40px_rgba(15,23,42,0.4)]"
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#1a5fb4]" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#1a5fb4]">Exam Insight Report</p>
                  </div>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                    Performance Dashboard
                  </h2>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:block text-right">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Status</p>
                    <p className="text-sm font-black text-slate-900">{resultSummary.accuracy >= 70 ? "Excellent Mastery" : resultSummary.accuracy >= 40 ? "Steady Progress" : "Keep Practicing"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResultsOpen(false)}
                    className="group flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-black text-white transition-all hover:bg-slate-800 active:scale-95"
                  >
                    Close & Exit
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="max-h-[calc(100vh-9rem)] overflow-y-auto px-6 py-8 sm:px-8">
                <div className="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
                  <div className="space-y-6">
                    <div className="relative overflow-hidden rounded-2xl bg-[#1a2b3c] p-8 text-white shadow-2xl shadow-blue-900/20">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Score</p>
                      <div className="mt-3 flex items-baseline gap-2">
                        <p className="text-6xl font-black tracking-tighter text-[#ffd34d]">
                          {resultSummary.correct}
                        </p>
                        <p className="text-2xl font-bold text-slate-500">/ {mockQuestions.length}</p>
                      </div>
                      
                      <div className="mt-8 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
                          <span className="text-slate-400">Accuracy</span>
                          <span className="text-emerald-400">{resultSummary.accuracy}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-800 overflow-hidden shadow-inner">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${resultSummary.accuracy}%` }}
                            className="h-full bg-emerald-500" 
                          />
                        </div>
                      </div>
                      <p className="mt-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        Time Taken: {formatClock(examElapsed)}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100">
                         <h4 className="text-emerald-900 font-black uppercase text-[10px] tracking-widest mb-3">Strong Areas</h4>
                         <div className="flex flex-wrap gap-2 text-[11px] font-bold text-emerald-700">
                            <span className="bg-white/50 px-2 py-1 rounded">Article 12-35</span>
                            <span className="bg-white/50 px-2 py-1 rounded">Mars Physics</span>
                         </div>
                      </div>
                      <div className="bg-rose-50 p-5 rounded-xl border border-rose-100">
                         <h4 className="text-rose-900 font-black uppercase text-[10px] tracking-widest mb-3">Weak Areas</h4>
                         <div className="flex flex-wrap gap-2 text-[11px] font-bold text-rose-700">
                            <span className="bg-white/50 px-2 py-1 rounded">Simple Interest</span>
                            <span className="bg-white/50 px-2 py-1 rounded">Ratio Analysis</span>
                         </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <SummaryBadge label="Correct" value={resultSummary.correct} tone="bg-[#eff8ee] text-[#5aa338] border-[#d7e9d6]" />
                      <SummaryBadge label="Wrong" value={resultSummary.incorrect} tone="bg-[#fff0ea] text-[#e36b2c] border-[#f9e2d7]" />
                      <SummaryBadge label="Skipped" value={resultSummary.unanswered} tone="bg-slate-50 text-slate-500 border-slate-200" />
                      <SummaryBadge label="Marked" value={summary.marked + summary.answered_marked} tone="bg-[#f2ebfb] text-[#6e5aa8] border-[#e2d5f1]" />
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Attempt Signals</p>
                      <div className="mt-4 grid grid-cols-1 gap-3">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-2 text-sm font-bold">
                          <span className="text-slate-500">Marked for Review</span>
                          <span className="text-[#6e5aa8]">{summary.marked + summary.answered_marked}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-50 pb-2 text-sm font-bold">
                          <span className="text-slate-500">Visited Questions</span>
                          <span className="text-[#e36b2c]">{mockQuestions.length - summary.not_visited}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-bold">
                          <span className="text-slate-500">Focus Distractions</span>
                          <span className="text-slate-900">{distractionEvents.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 sm:p-6">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                      <p className="text-sm font-black uppercase tracking-wider text-slate-900">Question Wise Analysis</p>
                    </div>
                    <div className="mt-6 space-y-4">
                      {resultSummary.detailed.map((item) => {
                        const selectedLabel =
                          item.entry.selectedOption !== null
                            ? String.fromCharCode(65 + item.entry.selectedOption)
                            : "N/A";
                        const correctLabel = String.fromCharCode(65 + item.question.correctAnswer);
                        return (
                          <div
                            key={item.question.id}
                            className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-[#1a5fb4]/30 hover:shadow-lg"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-500">
                                    {item.index + 1}
                                  </span>
                                  <p className="text-sm font-black text-slate-800 line-clamp-2">
                                    {item.question.question}
                                  </p>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest">
                                  <span className={`rounded-xl px-3 py-1.5 shadow-sm ring-1 ${
                                    item.isCorrect 
                                      ? "bg-emerald-50 text-emerald-600 ring-emerald-100" 
                                      : item.entry.selectedOption === null 
                                        ? "bg-slate-50 text-slate-400 ring-slate-100" 
                                        : "bg-rose-50 text-rose-600 ring-rose-100"
                                  }`}>
                                    {item.isCorrect ? "Correct" : item.entry.selectedOption === null ? "Skipped" : "Incorrect"}
                                  </span>
                                  {item.entry.wasMarkedForReview && (
                                    <span className="rounded-xl bg-indigo-50 px-3 py-1.5 text-indigo-600 ring-1 ring-indigo-100 shadow-sm">
                                      Review
                                    </span>
                                  )}
                                  {item.entry.lowConfidence && (
                                    <span className="rounded-xl bg-amber-50 px-3 py-1.5 text-amber-600 ring-1 ring-amber-100 shadow-sm">
                                      Low Confidence
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                                {formatClock(item.effectiveTime)}
                              </div>
                            </div>
                            <div className="mt-6 grid grid-cols-2 gap-3">
                              <ResultMeta label="Your Answer" value={item.entry.selectedOption !== null ? String.fromCharCode(65 + item.entry.selectedOption) : "—"} />
                              <ResultMeta label="Correct Answer" value={String.fromCharCode(65 + item.question.correctAnswer)} />
                              <ResultMeta label="Status" value={item.isCorrect ? "Correct" : item.entry.selectedOption === null ? "Skipped" : "Wrong"} />
                              <ResultMeta label="Time Spent" value={`${item.effectiveTime}s`} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {submitModalOpen && (
          <FinalSubmitModal 
            onClose={() => setSubmitModalOpen(false)}
            onConfirm={confirmFinish}
            summary={summary}
          />
        )}
      </AnimatePresence>
      </main>
  );
}

function PalettePanel({
  currentQuestionIndex,
  userAnswers,
  summary,
  onQuestionSelect,
}) {
  return (
    <div className="flex h-full flex-col bg-white overflow-hidden shadow-inner">
      {/* 🔹 Section 1: Progress */}
      <div className="px-6 py-6 border-b border-slate-200 bg-white">
        <div className="mb-4 flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-500">
           <span>Progress</span>
           <span className="text-blue-600">{summary.totalAnswered} / {userAnswers.length}</span>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${(summary.totalAnswered / userAnswers.length) * 100}%` }}
            className="h-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]"
          />
        </div>
      </div>

      {/* 🔹 Section 2: Stats */}
      <div className="px-6 py-6 border-b border-slate-200 bg-slate-50/50">
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 bg-emerald-500 rounded-sm" />
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">Answered</span>
            </div>
            <span className="text-sm font-black text-slate-900">{summary.answered + summary.answered_marked}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 bg-slate-400 rounded-sm" />
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">Not Answered</span>
            </div>
            <span className="text-sm font-black text-slate-900">{summary.visited + summary.not_visited}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 bg-amber-400 rounded-sm" />
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">Marked</span>
            </div>
            <span className="text-sm font-black text-slate-900">{summary.marked + summary.answered_marked}</span>
          </div>
        </div>
      </div>

      {/* 🔹 Section 3: Navigator */}
      <div className="flex-1 overflow-y-auto px-6 py-8 bg-white">
         <div className="flex items-center justify-between mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question Navigator</p>
         </div>
        <div className="grid grid-cols-5 gap-3">
          {userAnswers.map((answer, index) => {
            const isCurrent = index === currentQuestionIndex;
            return (
              <button
                key={`palette-${index + 1}`}
                type="button"
                onClick={() => onQuestionSelect(index)}
                className={getPaletteTone(answer.status, isCurrent)}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="p-6 bg-slate-900">
         <div className="rounded-xl border border-white/10 p-4">
            <p className="text-[9px] text-white/40 font-black uppercase tracking-widest text-center mb-1">Shortcut Tips</p>
            <div className="flex items-center justify-center gap-4 text-white/60">
               <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-black">1-4: Select</span>
               <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-black">Enter: Next</span>
            </div>
         </div>
      </div>
    </div>
  );
}

function FinalSubmitModal({ onClose, onConfirm, summary }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="bg-slate-50 p-8 flex flex-col items-center text-center">
           <div className="h-16 w-16 bg-rose-500 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg rotate-3">
              <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
           </div>
           <h3 className="text-2xl font-black text-slate-900 mb-2">Final Submission?</h3>
           <p className="text-slate-500 font-bold leading-relaxed mb-6">
             Once submitted, you cannot change your responses.
           </p>
           
           <div className="w-full grid grid-cols-3 gap-2 py-4 border-y border-slate-200">
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase">Answered</p>
                <p className="text-lg font-black text-emerald-600">{summary.answered + summary.answered_marked}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase">Skipped</p>
                <p className="text-lg font-black text-slate-400">{summary.visited + summary.not_visited}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase">Marked</p>
                <p className="text-lg font-black text-amber-500">{summary.marked + summary.answered_marked}</p>
              </div>
           </div>
        </div>
        <div className="p-8 space-y-3">
           <button 
             onClick={onConfirm}
             className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl active:scale-95"
           >
             Submit Test
           </button>
           <button 
             onClick={onClose}
             className="w-full bg-white border-2 border-slate-100 text-slate-400 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
           >
             Go Back
           </button>
        </div>
      </motion.div>
    </div>
  );
}

function SummaryBadge({ label, value, tone }) {
  return (
    <div className={`rounded border px-3 py-2.5 shadow-sm transition-all hover:shadow-md ${tone}`}>
      <p className="text-[9px] font-bold uppercase tracking-wider opacity-60">{label}</p>
      <p className="mt-0.5 text-xl font-black">{value}</p>
    </div>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <div className="rounded-md border border-slate-300 bg-white px-4 py-3 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500/80">
        {label}
      </p>
      <p className={`mt-0.5 text-xl font-black ${tone}`}>{value}</p>
    </div>
  );
}

function ResultMeta({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-black text-slate-800">{value}</p>
    </div>
  );
}
