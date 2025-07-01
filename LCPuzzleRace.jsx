import React, { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, XCircle, Trophy, RotateCcw, Play, AlertTriangle } from 'lucide-react';
import gameData from './workflow-game-data.json';


const LendingPuzzleRace = () => {
  // Initialize with a default domain, e.g., the first one from gameData or a specific one.
  // This ensures selectedDomain is not null when initializeGame is first called.
  const [selectedDomain, setSelectedDomain] = useState(gameData.domains[0]?.name || null); // FIX: Initialize with a default domain
  const [gameState, setGameState] = useState('menu'); // menu, playing, completed
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes for each puzzle
  const [score, setScore] = useState(0);
  const [currentStageIndex, setCurrentStageIndex] = useState(0); // Still used for stage name display and future expansion
  const [totalPuzzlesCompleted, setTotalPuzzlesCompleted] = useState(0); // New state for overall puzzle completion

  const [correctSteps, setCorrectSteps] = useState([]); // Loaded for current puzzle
  const [shuffledSteps, setShuffledSteps] = useState([]);
  const [arrangedSteps, setArrangedSteps] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');


  // New state for custom game messages (success/fail/winner)
  const [showGameMessage, setShowGameMessage] = useState(false);
  const [gameMessageTitle, setGameMessageTitle] = useState('');
  const [gameMessageText, setGameMessageText] = useState('');
  const [gameMessageIcon, setGameMessageIcon] = useState(null); // Lucide icon component

  // To track completed puzzles in the *current* session for randomization (avoiding repeats)
  const [completedPuzzlesInSession, setCompletedPuzzlesInSession] = useState([]); // Renamed from completedPuzzlesInStage

  // Function to get a random non-repeating puzzle from ANY stage
  const getRandomPuzzle = useCallback(() => {
    const selectedDomainData = gameData.domains.find(d => d.name === selectedDomain);
    if (!selectedDomainData) return null; // Ensure a domain is selected before proceeding

    const allPuzzles = selectedDomainData.stages.flatMap(stage => stage.puzzles);

    const availablePuzzles = allPuzzles.filter(
      (puzzle) => !completedPuzzlesInSession.includes(puzzle.id)
    );

    if (availablePuzzles.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * availablePuzzles.length);
    return availablePuzzles[randomIndex];
  }, [completedPuzzlesInSession, selectedDomain]);




  // Initialize game or move to the next puzzle
  const initializeGame = useCallback(() => {
    setShowGameMessage(false); // Hide any previous messages

    const puzzleData = getRandomPuzzle();

    if (puzzleData) {
      setCorrectSteps(puzzleData.correctSteps);
      // Shuffle the steps for the new puzzle
      // const shuffled = [...puzzleData.correctSteps].sort(() => Math.random() - 0.5);
      // setShuffledSteps(shuffled);
      setShuffledSteps(puzzleData.shuffledSteps || []);
      console.log("Setting Question: ", puzzleData.question);
      setCurrentQuestion(puzzleData.question || '');
      setArrangedSteps([]);
      setTimeLeft(180); // Reset timer for each new puzzle
      setGameState('playing'); // Ensure game state is playing
    } else {
      // This 'else' means getRandomPuzzle returned null, which implies all available puzzles are exhausted.
      setGameMessageTitle("No More Puzzles Available!");
      setGameMessageText("You've exhausted all unique puzzles in the game data for the selected domain."); // Clarify message
      setGameMessageIcon(<AlertTriangle className="text-yellow-500" />); // Keep yellow for warning
      setShowGameMessage(true);
      setTimeout(() => {
        setShowGameMessage(false);
        setGameState('menu');
      }, 3000);
    }
  }, [getRandomPuzzle]);

  // Start game from the beginning (menu button click)
  const startGame = () => {
    // If no domain is explicitly selected by the user, default to the first one available
    if (!selectedDomain && gameData.domains.length > 0) {
      setSelectedDomain(gameData.domains[0].name);
    }
    setCurrentStageIndex(0);
    setCompletedPuzzlesInSession([]);
    setScore(0);
    setTotalPuzzlesCompleted(0);
    // Use a setTimeout with 0 delay to ensure selectedDomain state updates before initializeGame is called
    // or refactor initializeGame to take selectedDomain as an argument.
    // For simplicity, ensuring selectedDomain is not null initially is better.
    initializeGame();
  };

  // Reset Game function
  const resetGame = () => {
    setGameState('menu');
    setSelectedDomain(gameData.domains[0]?.name || null);
    setScore(0);
    setTotalPuzzlesCompleted(0);
    setCompletedPuzzlesInSession([]);
    setTimeLeft(180);
    setShuffledSteps([]);
    setArrangedSteps([]);
    setShowGameMessage(false);
  };


  // Timer effect
  useEffect(() => {
    let interval;
    if (gameState === 'playing' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameState === 'playing') {
      // Time's up, game over
      setGameMessageTitle("Time's Up!");
      setGameMessageText("You ran out of time. Game Over!");
      setGameMessageIcon(<XCircle className="text-red-500" />); // Keep red for error
      setShowGameMessage(true);
      setTimeout(() => {
        setShowGameMessage(false);
        setGameState('menu');
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [gameState, timeLeft]);

  // Drag and drop handlers
  const handleDragStart = (e, item, source) => {
    setDraggedItem({ item, source });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetArea) => {
    e.preventDefault();
    if (!draggedItem) return;

    const { item, source } = draggedItem;

    let newShuffledSteps = [...shuffledSteps];
    let newArrangedSteps = [...arrangedSteps];

    if (targetArea === 'arranged' && source === 'shuffled') {
      newShuffledSteps = newShuffledSteps.filter(step => step.id !== item.id);
      newArrangedSteps = [...newArrangedSteps, item];
    } else if (targetArea === 'shuffled' && source === 'arranged') {
      newArrangedSteps = newArrangedSteps.filter(step => step.id !== item.id);
      newShuffledSteps = [...newShuffledSteps, item];
    }

    setShuffledSteps(newShuffledSteps);
    setArrangedSteps(newArrangedSteps);
    setDraggedItem(null);

    // Check solution when the arranged steps length matches the correct steps length
    // Use the updated state values for checking
    // if (targetArea === 'arranged' && newArrangedSteps.length === correctSteps.length) {
    //   checkSolution(newArrangedSteps);
    // }
  };

  const checkSolution = (solution) => {
    // Only check if all steps are arranged
    if (solution.length !== correctSteps.length) {
      return;
    }
    const isCorrect = solution.every((step, index) => step.id === correctSteps[index].id);

    if (isCorrect) {
      const timeBonus = Math.floor(timeLeft / 10);
      setScore(prev => prev + 1000 + timeBonus);

      // Mark the current puzzle as completed in the session
      // Find current puzzle by matching its first step's ID across ALL puzzles
      // FIX: Get puzzles from the selected domain, not directly from gameData.stages
      const selectedDomainData = gameData.domains.find(d => d.name === selectedDomain);
      let currentPuzzleId = null;
      if (selectedDomainData) {
        const allPuzzlesInSelectedDomain = selectedDomainData.stages.flatMap(stage => stage.puzzles);
        currentPuzzleId = allPuzzlesInSelectedDomain.find(
          (puzzle) => puzzle.correctSteps[0].id === correctSteps[0].id
        )?.id;
      }

      if (currentPuzzleId) {
        setCompletedPuzzlesInSession(prev => [...prev, currentPuzzleId]);
      }

      // Calculate the total puzzles completed AFTER this one
      const newTotalPuzzlesCompleted = totalPuzzlesCompleted + 1; // Use the current state and add 1
      setTotalPuzzlesCompleted(newTotalPuzzlesCompleted); // Update the state

      // IMMEDIATE CHECK FOR WIN CONDITION
      if (newTotalPuzzlesCompleted >= gameData.levelsToWin) {
        setGameMessageTitle("Congratulations, Winner!");
        setGameMessageText(`You've mastered ${gameData.levelsToWin} workflows in ${selectedDomain} with a final score of ${score + 1000 + timeBonus}!`); // Ensure score is updated in message
        setGameMessageIcon(<Trophy className="text-yellow-500" />); // Keep yellow for trophy
        setShowGameMessage(true);
        setTimeout(() => { // Still use timeout to show message
          setShowGameMessage(false);
          setGameState('completed'); // Set game state to completed
        }, 3000); // Longer message time for win
      } else {
        // Show success message and proceed to next puzzle
        setGameMessageTitle("Correct Order!");
        setGameMessageText("Excellent! Proceeding to the next challenge.");
        setGameMessageIcon(<CheckCircle className="text-green-600" />); // Darker green for corporate theme
        setShowGameMessage(true);

        setTimeout(() => {
          setShowGameMessage(false);
          initializeGame(); // Load next puzzle
        }, 2000); // Show message for 2 seconds
      }

    } else {
      // Handle incorrect solution - Game Over
      setScore(prev => Math.max(0, prev - 50));
      setGameMessageTitle("Incorrect Order!");
      setGameMessageText("Oops! The workflow is incorrect. Game Over.");
      setGameMessageIcon(<XCircle className="text-red-600" />); // Darker red for corporate theme
      setShowGameMessage(true);

      setTimeout(() => {
        setShowGameMessage(false);
        setGameState('menu');
      }, 3000);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseColorClass = (phase) => {
    switch (phase) {
      case 'initiation': return 'phase-corporate-blue';
      case 'execution': return 'phase-corporate-green';
      case 'settlement': return 'phase-corporate-orange';
      default: return 'phase-corporate-default';
    }
  };

  return (
    <div className="lc-puzzle-container">
      <style>
        {`
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            overflow-x: hidden;
        }

        .lc-puzzle-container {
            min-height: 100vh;
            background-color: #F8F9FA; /* Light gray/off-white background */
            padding: 20px;
            box-sizing: border-box;
            color: #333333; /* Dark gray for general text */
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            /* Increased max-width for the overall container */
            max-width: 1400px; /* Adjust as needed for desired page width */
            margin: 0 auto; /* Center the container */
        }

        /* Menu State */
        .menu-container {
            min-height: 100vh;
            width: 100%;
            background-color: #F8F9FA; /* Consistent with main background */
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
        }

        .menu-card {
            background: #FFFFFF; /* Solid white background */
            border-radius: 8px; /* Slightly less rounded */
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); /* Softer shadow */
            padding: 2rem;
            max-width: 48rem; /* Increased max-width for menu card */
            width: 100%;
            text-align: center;
            border: 2px solid #DDDDDD; /* More prominent border */
        }

        .menu-icon {
            margin: 0 auto 1rem;
            height: 4rem;
            width: 4rem;
            color: #004481; /* Corporate blue icon color */
        }

        .menu-title {
            font-size: 2.2rem; /* Larger title */
            font-weight: 700;
            color: #333333;
            margin-bottom: 0.75rem;
        }

        .menu-subtitle {
            color: #666666; /* Medium gray for subtitle */
            margin-bottom: 2rem; /* Increased margin */
            font-size: 1.1rem; /* Slightly larger subtitle */
        }

        .how-to-play-box {
            background-color: #F0F4F8; /* Lighter background for the box */
            border-radius: 6px; /* Slightly less rounded */
            padding: 1.5rem; /* Increased padding */
            margin-bottom: 2rem; /* Increased margin */
            text-align: left;
            color: #333333;
            border: 1px solid #CCCCCC; /* More visible border */
        }

        .how-to-play-title {
            font-weight: 600;
            color: #333333;
            margin-bottom: 0.75rem; /* Adjusted margin */
            font-size: 1.1rem; /* Slightly larger title */
        }
        .how-to-play-list li {
            margin-bottom: 0.6rem; /* Adjusted margin */
            line-height: 1.6; /* Slightly more line height */
            color: #666666;
            font-size: 0.95rem;
        }

        .domain-selection-container {
            margin-bottom: 2rem; /* Increased margin */
            text-align: center;
            border: 1px solid #CCCCCC; /* Border for the domain section */
            padding: 1.5rem;
            border-radius: 6px;
            background-color: #FDFDFD;
        }

        .domain-selection-container label {
            display: block;
            margin-bottom: 1rem; /* Increased margin */
            color: #333333;
            font-weight: 600;
            font-size: 1.1rem;
        }

        .domain-buttons-wrapper {
            display: flex;
            gap: 0.75rem; /* Increased gap */
            flex-wrap: wrap;
            justify-content: center; /* Center items in case of odd number */
        }

        .domain-button {
            padding: 10px 20px; /* Increased padding */
            border: 1px solid #004481; /* Blue border */
            background: #FFFFFF;
            color: #004481;
            border-radius: 6px; /* More rounded */
            cursor: pointer;
            transition: all 0.2s ease; /* Faster transition */
            font-weight: 600;
            /* Calculate width for two buttons per row, considering gap */
            flex: 1 1 calc(50% - 0.75rem); /* Two buttons per row with a gap */
            max-width: calc(50% - 0.75rem); /* Ensures it doesn't grow beyond 50% */
            min-width: 150px; /* Minimum width to prevent shrinking too much on small screens */
            font-size: 1rem; /* Slightly larger font */
            box-shadow: 0 2px 5px rgba(0, 68, 129, 0.1); /* Subtle shadow */
        }

        @media (max-width: 600px) {
            .domain-button {
                flex: 1 1 100%; /* Full width on very small screens */
                max-width: 100%;
            }
        }


        .domain-button.selected,
        .domain-button:hover {
            background: #004481; /* Solid blue background */
            color: #FFFFFF;
            transform: translateY(-3px); /* More pronounced lift */
            box-shadow: 0 5px 12px rgba(0, 68, 129, 0.4); /* More prominent blue shadow */
        }

        .start-game-button, .play-again-button {
            background: #004481; /* Solid corporate blue */
            color: #FFFFFF;
            border: none;
            padding: 15px 35px; /* Adjusted padding */
            border-radius: 8px; /* More rounded */
            font-size: 1.2rem; /* Larger font */
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 5px 15px rgba(0, 68, 129, 0.3); /* More prominent shadow */
            font-weight: 600;
            letter-spacing: 0.5px; /* More letter spacing */
            width: 100%;
            margin-top: 2rem; /* Increased margin */
        }

        .start-game-button:hover, .play-again-button:hover {
            transform: translateY(-4px); /* More pronounced lift */
            box-shadow: 0 8px 20px rgba(0, 68, 129, 0.4);
            background-color: #0056A0; /* Slightly darker blue on hover */
        }

        /* Game Playing State */
        .game-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            max-width: 1200px; /* Increased max-width */
            background: #FFFFFF; /* Solid white background */
            padding: 0.8rem 1.5rem; /* Adjusted padding */
            border-radius: 8px;
            margin-bottom: 1.5rem;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); /* Lighter shadow */
            color: #333333;
            border: 1px solid #DDDDDD; /* Subtle border */
        }

        .game-header-item {
            display: flex;
            align-items: center;
            gap: 0.4rem; /* Smaller gap */
            font-size: 1rem; /* Slightly smaller font */
            font-weight: 600;
            color: #666666; /* Medium gray text */
        }

        .game-header-item svg {
            color: #004481; /* Corporate blue icon color */
            height: 1.1rem; /* Smaller icons */
            width: 1.1rem;
        }

        .score-value, .timer-display, .puzzles-completed-display, .domain-display {
            font-size: 1.3rem; /* Slightly smaller font */
            font-weight: 700;
            color: #004481; /* Corporate blue for values */
        }

        .reset-button {
            background: #DC3545; /* Red background */
            color: #FFFFFF; /* White text */
            border: 1px solid #DC3545;
            padding: 8px 15px;
            border-radius: 5px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 0.9rem;
            font-weight: 600;
            transition: all 0.2s ease;
        }

        .reset-button:hover {
            background: #C82333; /* Darker red on hover */
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }

        .puzzle-grids {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1.5rem;
            width: 100%;
            max-width: 1200px; /* Increased max-width */
        }

        @media (min-width: 768px) {
            .puzzle-grids {
                grid-template-columns: 1fr 1fr;
            }
        }

        .puzzle-section {
            background: #FFFFFF; /* Solid white background */
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            min-height: 400px;
            border: 1px solid #DDDDDD; /* Subtle border */
        }

        .puzzle-section-title {
            font-size: 1.4rem; /* Slightly smaller */
            font-weight: 700;
            color: #333333;
            margin-bottom: 1rem;
            text-align: center;
        }

       .puzzle-drop-area {
  flex-grow: 0;
  border: 1px dashed rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 0.75rem;
  overflow-y: auto;
  height: 600px; /* fixed height for up to 5 steps with padding */
  background: rgba(255, 255, 255, 0.7);
  box-sizing: border-box;
}


        .puzzle-step-card {
            background-color: #FFFFFF;
            border-radius: 6px;
            padding: 1rem;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08); /* Softer shadow */
            cursor: grab;
            position: relative;
            border-left: 4px solid; /* Slightly thinner for phase color */
            transition: transform 0.15s ease, box-shadow 0.15s ease; /* Faster transition */
            color: #333333;
            border: 1px solid #EEEEEE; /* Light border for card */
        }

        .puzzle-step-card:hover {
            transform: translateY(-1px); /* More subtle lift */
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
        }

        .puzzle-step-card .title {
            font-weight: 600; /* Less bold */
            font-size: 1rem;
            margin-bottom: 0.2rem;
            color: #333333;
        }

        .puzzle-step-card .description {
            font-size: 0.85rem;
            color: #666666;
            margin-bottom: 0.4rem;
        }

        .puzzle-step-card .phase {
            font-size: 0.75rem;
            font-weight: 600;
            color: #888888; /* Muted phase text color */
            margin-top: 0.25rem;
            text-transform: capitalize;
        }

        .arranged-step-number {
            position: absolute;
            left: -0.4rem;
            top: -0.4rem;
            background-color: #004481; /* Corporate blue */
            color: #fff;
            border-radius: 9999px;
            width: 1.4rem;
            height: 1.4rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.7rem;
            font-weight: 700;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        .feedback-icon {
            position: absolute;
            top: 0.4rem;
            right: 0.4rem;
            height: 1.1rem;
            width: 1.1rem;
        }
        .feedback-icon.correct {
            color: #28A745; /* Standard green */
        }
        .feedback-icon.incorrect {
            color: #DC3545; /* Standard red */
        }

        .empty-drop-area-text {
            color: #888888; /* Lighter gray for placeholder */
            text-align: center;
            padding: 2rem 0;
            flex-grow: 1;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* Phase Legend */
        .phase-legend-box {
            margin-top: 1.5rem;
            background: #FFFFFF;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 1200px; /* Increased max-width */
            color: #333333;
            border: 1px solid #DDDDDD; /* Subtle border */
        }

        .phase-legend-title {
            font-size: 1.1rem; /* Slightly smaller */
            font-weight: 700;
            margin-bottom: 1rem;
            text-align: center;
            color: #333333;
        }

        .phase-legend-items {
            display: flex;
            justify-content: center;
            gap: 1.2rem; /* Smaller gap */
            flex-wrap: wrap;
        }

        .phase-legend-item {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            font-size: 0.95rem;
        }

        .phase-color-box {
            width: 1rem; /* Smaller color box */
            height: 1rem;
            border-radius: 3px; /* Slightly less rounded */
        }

        /* New Corporate Phase Colors */
        .phase-corporate-blue { border-color: #93C5FD; background-color: #DBEAFE; } /* Dark Blue for Initiation */
        .phase-corporate-green { border-color:  #FDBA74; background-color: #FFEDD5; } /* Standard Green for Execution */
        .phase-corporate-orange { border-color: #A7F3D0; background-color: #D1FAE5; } /* Standard Orange for Settlement */
        .phase-corporate-default { border-color: #D1D5DB; background-color: #F3F4F6; } /* Muted Gray for default */


        .phase-legend-text {
            color: #666666;
        }

        /* Completed State */
        .completed-container {
            min-height: 100vh;
            width: 100%;
            background-color: #F8F9FA;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
        }

        .completed-card {
            background: #FFFFFF;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            padding: 2rem;
            max-width: 28rem;
            width: 100%;
            text-align: center;
            border: 1px solid #DDDDDD; /* Subtle border */
        }

        .completed-icon {
            margin: 0 auto 1rem;
            height: 4rem;
            width: 4rem;
            color: #004481;
        }

        .completed-title {
            font-size: 2rem;
            font-weight: 700;
            color: #333333;
            margin-bottom: 0.5rem;
        }

        .completed-score {
            font-size: 1.4rem; /* Slightly smaller */
            font-weight: 700;
            color: #004481;
            margin-bottom: 1rem;
        }

        .workflow-mastered-box {
            background-color: #FFFFFF;
            border-radius: 6px;
            padding: 1rem;
            margin-bottom: 1.5rem;
            color: #333333;
            border: 1px solid #EEEEEE;
        }
        .workflow-mastered-box h3 {
            color: #333333;
            margin-bottom: 0.5rem;
        }
        .workflow-mastered-box ul li {
            color: #666666;
        }


        /* Game Message Modal */
        .game-message-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5); /* Slightly less opaque */
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            z-index: 1000;
        }

        .game-message-modal-content {
            background: #FFFFFF; /* Solid white */
            border-radius: 8px;
            padding: 2rem;
            max-width: 28rem;
            width: 100%;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2); /* Softer shadow */
            color: #333333;
            border: 1px solid #DDDDDD; /* Subtle border */
        }

        .game-message-modal-icon {
            margin: 0 auto 1rem;
            height: 3.5rem; /* Slightly smaller icon */
            width: 3.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #004481; /* Corporate blue for icons */
        }
        .game-message-modal-icon svg {
            height: 100%;
            width: 100%;
        }

        .game-message-modal-title {
            font-size: 1.8rem; /* Slightly smaller */
            font-weight: 700;
            color: #333333;
            margin-bottom: 0.5rem;
        }

        .game-message-modal-text {
            font-size: 0.95rem;
            color: #666666;
            margin-bottom: 1rem;
        }
        `}
      </style>

      {gameState === 'menu' && (
        <div className="menu-container">
          <div className="menu-card">
            <Trophy className="menu-icon" />
            <h1 className="menu-title">Lending Puzzle Race</h1>
            <p className="menu-subtitle">Arrange the steps to complete the Lending Workflow!</p>

            <div className="domain-selection-container">
              <label>Choose a Domain:</label>
              <div className="domain-buttons-wrapper">
                {gameData.domains.map(domain => (
                  <button
                    key={domain.name}
                    onClick={() => setSelectedDomain(domain.name)}
                    className={`domain-button ${selectedDomain === domain.name ? 'selected' : ''}`}
                  >
                    {domain.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="how-to-play-box">
              <h3 className="how-to-play-title">How to Play:</h3>
              <ul className="how-to-play-list">
                <li>Drag and drop the shuffled Lending workflow steps into the "Arranged Steps" box.</li>
                <li>Arrange them in the correct sequence.</li>
                <li>You have 3 minutes per puzzle.</li>
                <li>Complete {gameData.levelsToWin} puzzles to win the game!</li>
              </ul>
            </div>

            <button
              onClick={startGame}
              className="start-game-button"
              disabled={!selectedDomain} // Disable if no domain is selected
            >
              {selectedDomain ? 'Start Game' : 'Select a Domain to Start'}
            </button>
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <>
          {showGameMessage && (
            <div className="game-message-modal-overlay">
              <div className="game-message-modal-content">
                <div className="game-message-modal-icon">
                  {gameMessageIcon}
                </div>
                <h2 className="game-message-modal-title">{gameMessageTitle}</h2>
                <p className="game-message-modal-text">{gameMessageText}</p>
              </div>
            </div>
          )}

          <div className="game-header">
            <div className="game-header-item">
              Domain: <span className="domain-display">{selectedDomain}</span>
            </div>
            <div className="game-header-item">
              <Clock />
              Time Left: <span className={`timer-display ${timeLeft <= 30 ? 'text-red-500' : ''}`}>{formatTime(timeLeft)}</span>
            </div>
            <div className="game-header-item">
              <Trophy />
              Score: <span className="score-value">{score}</span>
            </div>
            <div className="game-header-item">
              <CheckCircle />
              Puzzles Completed: <span className="puzzles-completed-display">{totalPuzzlesCompleted} / {gameData.levelsToWin}</span>
            </div>
            <button onClick={resetGame} className="reset-button">
              <RotateCcw size={18} /> Reset Game
            </button>
          </div>
          <div style={{
            maxWidth: '1200px',
            marginBottom: '1rem',
            color: '#004481',
            fontSize: '1.25rem',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            {currentQuestion}
          </div>
          <div className="puzzle-grids">
            <div className="puzzle-section">
              <h2 className="puzzle-section-title">Unordered Workflow</h2>
              <div
                className="puzzle-drop-area"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'shuffled')}
              >
                {shuffledSteps.length > 0 ? (
                  shuffledSteps.map((step) => (
                    <div
                      key={step.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, step, 'shuffled')}
                      className={`puzzle-step-card ${getPhaseColorClass(step.phase)}`}
                    >
                      <div className="title">{step.title}</div>
                      <div className="description">{step.description}</div>
                      <div className="phase">{step.phase} Phase</div>
                    </div>
                  ))
                ) : (
                  <div className="empty-drop-area-text">
                    All steps have been moved to the arranged area.
                  </div>
                )}
              </div>
            </div>


            <div className="puzzle-section">
              <h2 className="puzzle-section-title">Ordered Workflow	</h2>
              <div
                className="puzzle-drop-area"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'arranged')}
              >
                {arrangedSteps.length > 0 ? (
                  arrangedSteps.map((step, index) => (
                    <div
                      key={step.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, step, 'arranged')}
                      className={`puzzle-step-card ${getPhaseColorClass(step.phase)}`}
                    >
                      <span className="arranged-step-number">{index + 1}</span>
                      <div className="title">{step.title}</div>
                      <div className="description">{step.description}</div>
                      <div className="phase">{step.phase} Phase</div>
                      {arrangedSteps.length === correctSteps.length && step.id === correctSteps[index]?.id && (
                        <CheckCircle className="feedback-icon correct" />
                      )}
                      {arrangedSteps.length === correctSteps.length && step.id !== correctSteps[index]?.id && (
                        <XCircle className="feedback-icon incorrect" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="empty-drop-area-text">
                    Drag steps here to arrange the Lending workflow in correct order
                  </div>
                )}
              </div>
            </div>
          </div>
          {gameState === 'playing' && (
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                className="start-game-button"
                onClick={() => checkSolution(arrangedSteps)}
                disabled={arrangedSteps.length !== correctSteps.length}
              >
                Submit Workflow
              </button>
            </div>
          )}

          {/* Phase Legend */}
          <div className="phase-legend-box">
            <h3 className="phase-legend-title">Lending Phases:</h3>
            <div className="phase-legend-items">
              <div className="phase-legend-item">
                <div className="phase-color-box phase-corporate-blue"></div>
                <span className="phase-legend-text">Initiation</span>
              </div>
              <div className="phase-legend-item">
                <div className="phase-color-box phase-corporate-green"></div>
                <span className="phase-legend-text">Execution</span>
              </div>
              <div className="phase-legend-item">
                <div className="phase-color-box phase-corporate-orange"></div>
                <span className="phase-legend-text">Settlement</span>
              </div>
            </div>
          </div>
        </>
      )}

      {gameState === 'completed' && (
        <div className="completed-container">
          <div className="completed-card">
            <Trophy className="completed-icon" />
            <h1 className="completed-title">Game Over!</h1>
            <p className="completed-score">Final Score: {score}</p>
            <p className="completed-score">Total Puzzles Mastered: {totalPuzzlesCompleted}</p>

            <div className="workflow-mastered-box">
              <h3>Workflows you mastered:</h3>
              <ul>
                {gameData.domains.map(domain => {
                  const domainPuzzles = domain.stages.flatMap(stage => stage.puzzles);
                  const completedPuzzles = domainPuzzles.filter(p =>
                    completedPuzzlesInSession.includes(p.id)
                  );
                  if (completedPuzzles.length === 0) return null;

                  return (
                    <li key={domain.name}>
                      <strong>{domain.name}</strong>
                      <ul>
                        {completedPuzzles.map(p => (
                          <li key={p.id}>{p.question}</li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </div>


            <button onClick={() => setGameState('menu')} className="play-again-button">
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LendingPuzzleRace;
