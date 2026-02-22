import { addDoc, collection, updateDoc, doc } from "firebase/firestore";
import { db, auth } from "../services/firebase";
import { useState, useEffect, useRef } from "react";
import { TETROMINOES } from "../utils/tetrominoes";
import { useLocation } from "react-router-dom";
import html2canvas from "html2canvas";
import popSound from "../assets/sounds/pop.mp3";
import rotateSound from "../assets/sounds/rotate.mp3";
import errorSound from "../assets/sounds/error.mp3";

const ROWS = 20;
const COLS = 12;

const Editor = () => {
  const location = useLocation();
  const designId = location.state?.designId || null;
  const gridRef = useRef(null);

  const [backgroundImage, setBackgroundImage] = useState(null);

  const createGrid = () => {
    return Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => null),
    );
  };

  const [grid, setGrid] = useState(() => {
    if (location.state?.grid) {
      return location.state.grid;
    }

    const saved = localStorage.getItem("tetris-art-grid");
    return saved ? JSON.parse(saved) : createGrid();
  });
  const [selectedPiece, setSelectedPiece] = useState("I");
  const [rotation, setRotation] = useState(0);
  const [selectedColor, setSelectedColor] = useState("cyan");
  const [isEraser, setIsEraser] = useState(false);
  const [designName, setDesignName] = useState(
    location.state?.designName || "",
  );
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [previewAnim, setPreviewAnim] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });

    setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  useEffect(() => {
    localStorage.setItem("tetris-art-grid", JSON.stringify(grid));
  }, [grid]);

  const rotateMatrix = (matrix) => {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const rotated = Array.from({ length: cols }, () =>
      Array.from({ length: rows }, () => 0),
    );
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        rotated[c][rows - 1 - r] = matrix[r][c];
      }
    }
    return rotated;
  };

  const getRotatedShape = () => {
    let shape = TETROMINOES[selectedPiece];

    for (let i = 0; i < rotation; i++) {
      shape = rotateMatrix(shape);
    }

    // Remove empty rows
    shape = shape.filter((row) => row.some((cell) => cell === 1));

    // Remove empty columns
    const colCount = shape[0].length;
    const validCols = [];

    for (let c = 0; c < colCount; c++) {
      if (shape.some((row) => row[c] === 1)) {
        validCols.push(c);
      }
    }

    shape = shape.map((row) => validCols.map((c) => row[c]));

    return shape;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
      }

      if (e.ctrlKey && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [history, redoStack]);

  useEffect(() => {
    setPreviewAnim(true);

    const timer = setTimeout(() => {
      setPreviewAnim(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [rotation]);

  //Grid Clone
  const cloneGrid = (gridToClone) => {
    return gridToClone.map((row) => [...row]);
  };

  // Handle Cell Click
  const handleCellClick = (row, col) => {
    if (isEraser) {
      const newGrid = grid.map((r) => [...r]);
      newGrid[row][col] = null;
      setHistory((prev) => [...prev.slice(-20), cloneGrid(grid)]);
      setRedoStack([]); // clear redo stack
      setGrid(newGrid);
      return;
    }

    const newGrid = grid.map((r) => [...r]);

    let shape = TETROMINOES[selectedPiece];

    for (let i = 0; i < rotation; i++) {
      shape = rotateMatrix(shape);
    }

    // Check collision first
    for (let rIdx = 0; rIdx < shape.length; rIdx++) {
      for (let cIdx = 0; cIdx < shape[rIdx].length; cIdx++) {
        if (shape[rIdx][cIdx] === 1) {
          const newRow = row + rIdx;
          const newCol = col + cIdx;

          // Check boundary
          if (newRow >= ROWS || newCol >= COLS) {
            return; // stop placement
          }

          // Check collision
          if (newGrid[newRow][newCol] !== null) {
            return; // stop placement
          }
        }
      }
    }

    // If safe, place piece
    shape.forEach((shapeRow, rIdx) => {
      shapeRow.forEach((cell, cIdx) => {
        if (cell === 1) {
          const newRow = row + rIdx;
          const newCol = col + cIdx;
          newGrid[newRow][newCol] = selectedColor;
        }
      });
    });

    // Save previous state before updating
    setHistory((prev) => [...prev.slice(-20), cloneGrid(grid)]);
    setRedoStack([]); // clear redo stack
    setGrid(newGrid);
  };

  // Clear Board Function
  const clearBoard = () => {
    setHistory((prev) => [...prev.slice(-20), cloneGrid(grid)]);
    setRedoStack([]); // clear redo stack
    setGrid(createGrid());
  };

  // Handle Save Design
  const handleSaveDesign = async () => {
    if (!designName) {
      playSound(errorSound);
      showToast("Please enter design name", "error");
      return;
    }

    try {
      if (designId) {
        // 🔥 Update existing design
        const designRef = doc(db, "designs", designId);

        await updateDoc(designRef, {
          name: designName,
          grid: JSON.stringify(grid),
          updatedAt: new Date(),
        });

        showToast("Design updated successfully!");
      } else {
        // 🔥 Create new design
        await addDoc(collection(db, "designs"), {
          name: designName,
          grid: JSON.stringify(grid),
          userId: auth.currentUser.uid,
          createdAt: new Date(),
        });

        playSound(popSound);
        showToast("Design saved successfully!");
      }
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  // PNG Export
  const handleExport = async () => {
    if (!gridRef.current) return;

    const canvas = await html2canvas(gridRef.current);

    const link = document.createElement("a");
    link.download = `${designName || "tetris-art"}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // Apply for background
  const handleApplyBackground = async () => {
    if (!gridRef.current) return;

    const canvas = await html2canvas(gridRef.current);
    const imageData = canvas.toDataURL();

    setBackgroundImage(imageData);
  };

  // Handle UNDO
  const handleUndo = () => {
    if (history.length === 0) return;

    const previous = history[history.length - 1];

    setHistory((prev) => prev.slice(0, -1));

    // push current grid into redo stack
    setRedoStack((prev) => [...prev.slice(-20), cloneGrid(grid)]);

    setGrid(previous);
  };

  //Handle Redo
  const handleRedo = () => {
    if (redoStack.length === 0) return;

    const next = redoStack[redoStack.length - 1];

    setRedoStack((prev) => prev.slice(0, -1));

    // push current grid back into history
    setHistory((prev) => [...prev.slice(-20), cloneGrid(grid)]);

    setGrid(next);
  };

  const playSound = (sound) => {
    const audio = new Audio(sound);
    audio.volume = 0.25; // subtle
    audio.play();
  };

  return (
    <div
      className="min-h-screen relative text-white flex flex-col items-center p-6"
      style={{
        backgroundImage: backgroundImage
          ? `url(${backgroundImage})`
          : undefined,
        backgroundSize: "auto",
        backgroundRepeat: "repeat",
        backgroundPosition: "top left",
        backgroundColor: backgroundImage ? "transparent" : "#111827",
      }}
    >
      {/* Blur Layer */}
      {backgroundImage && (
        <div className="absolute inset-0 backdrop-blur-md bg-black/40 z-0"></div>
      )}

      {/* Content Layer */}
      <div className="relative z-10 w-full flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-6">🎮 Tetris Art Studio</h1>

        {/* Piece Selector */}
        <div className="bg-gray-800/70 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-gray-700 space-y-6 mb-8 w-full max-w-2xl">
          <div className="flex flex-col items-center mb-6">
            <p className="text-sm text-gray-400 mb-2">Current Preview</p>

            <div
              className={`grid gap-1 p-3 bg-gray-900 rounded-lg shadow-inner transition-all duration-200 ${
                previewAnim ? "scale-110 opacity-70" : "scale-100 opacity-100"
              }`}
              style={{
                gridTemplateColumns: `repeat(${getRotatedShape()[0].length}, 1fr)`,
              }}
            >
              {getRotatedShape().map((row, rIdx) =>
                row.map((cell, cIdx) => (
                  <div
                    key={`preview-${rIdx}-${cIdx}`}
                    className="w-6 h-6"
                    style={{
                      backgroundColor:
                        cell === 1 ? selectedColor : "transparent",
                      border: "1px solid #374151",
                    }}
                  ></div>
                )),
              )}
            </div>
          </div>
          <p className="text-sm text-gray-400 text-center tracking-wide">
            Select Piece
          </p>
          <div className="flex justify-center gap-3">
            {Object.keys(TETROMINOES).map((piece) => (
              <button
                key={piece}
                onClick={() => setSelectedPiece(piece)}
                className={`px-4 py-2 rounded btn-effect ${
                  selectedPiece === piece
                    ? "bg-green-500 shadow-lg shadow-green-500/60"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                {piece}
              </button>
            ))}
          </div>

          {/* Rotate + Eraser */}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => {
                setRotation((prev) => (prev + 1) % 4);
                playSound(rotateSound);
              }}
              className="px-4 py-2 bg-blue-600 rounded btn-effect"
            >
              Rotate 🔄
            </button>

            <button
              onClick={() => setIsEraser((prev) => !prev)}
              className={`px-4 py-2 rounded btn-effect ${
                isEraser ? "bg-yellow-500" : "bg-gray-600"
              }`}
            >
              {isEraser ? "Eraser ON 🧽" : "Eraser OFF"}
            </button>
          </div>

          {/* Color Palette */}
          <p className="text-sm text-gray-400 text-center tracking-wide">
            Choose Color
          </p>
          <div className="flex justify-center gap-3">
            {["cyan", "red", "yellow", "green", "purple", "orange"].map(
              (color) => (
                <div
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 cursor-pointer border-2 ${
                    selectedColor === color ? "border-white" : "border-gray-500"
                  }`}
                  style={{ backgroundColor: color }}
                ></div>
              ),
            )}
          </div>

          {/* Action Buttons */}
          <p className="text-sm text-gray-400 text-center tracking-wide">
            Actions
          </p>
          <div className="flex justify-center">
            <input
              type="text"
              placeholder="Enter design name..."
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              className="w-full max-w-xs px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-gray-400"
            />
          </div>
          <div className="flex justify-center gap-4 flex-wrap">
            <button
              onClick={clearBoard}
              className="px-4 py-2 bg-red-600 rounded btn-effect"
            >
              Clear 🧹
            </button>

            <button
              onClick={handleSaveDesign}
              className="px-4 py-2 bg-purple-600 rounded btn-effect"
            >
              Save 💾
            </button>

            <button
              onClick={handleExport}
              className="px-4 py-2 bg-indigo-600 rounded btn-effect"
            >
              Export 🖼
            </button>

            <button
              onClick={handleApplyBackground}
              className="px-4 py-2 bg-pink-600 rounded btn-effect"
            >
              Apply 🎨
            </button>
          </div>
        </div>

        {/* Grid */}
        <div
          ref={gridRef}
          className="grid grid-cols-12 gap-1 bg-gray-800 p-4 rounded-2xl shadow-2xl border border-indigo-500/30 shadow-indigo-500/20"
        >
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                className="w-10 h-10 border border-gray-800 cursor-pointer hover:scale-105 transition-transform duration-150"
                style={{ backgroundColor: cell || "black" }}
              ></div>
            )),
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`px-6 py-3 rounded-xl shadow-xl text-white font-medium transition-all duration-300 transform ${
              toast.type === "error" ? "bg-red-600" : "bg-green-600"
            } animate-slide-in`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;
