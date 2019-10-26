/*
TODOs:
	UX
		Improve overall L&F
		Make canvas react to screen size
		Make music play immediately
	Controls
		Allow user to "draw" seed
		Save board states to file
			Read them back in
	Misc
		Explore Game variations 
Done:
	UX
		Play background music
			Pause music when game is paused
		Play/Pause by space bar
		Play/Pause by screen click
		Add "Mute/Unmute" button
	Controls
		Randomize seed
			Clear old state before randomizing board
			User-defined sparsity of live cells
			What happens when a user randomizes an active game? (Answer: What you would expect)
		Control speed
			Allow user to change speed on the fly
		Reuse buttons (Step)
		Generation counter
	Code org
		Comment all functions
		Create additional var for boardDim
	Misc
		Handle edge of board gracefully
		Detect when stable state has been reached
*/

/// Globals ///
var boardDim = 100 + 10; // leave a padding of 5 on each side of the visibile board
var pixelsPerSide = 5; // Number of pixels "tall" and "wide" each cell is
var gameBoard = null; // Holds all the actual numbers
var drawSpace = null; // Holds HTML canvas context
var gameBoard_prevGeneration = null;
var gameBoard_2GenerationsBack = null;
var stableStateReached = false;
var audio = null; // Used to load and play background music
var generation = 0; // How many iterations of the Game have been played
var speed = 80; // delay is calculated off this
var delay = 5; // Used to determine how many milliseconds to pause between generations
var isPaused = true; // Is the game paused?
var isMuted = false; // Is the background music muted?
var gameLoop = null;
/// The initial pattern (seed) ///
// (Uncomment the seed that you want to test)
//seed = [[50,49], [50,50], [50,51]]; // "Blinker"
//seed = [[3,1], [3,2], [3,3], [2,2], [2,3], [2,4]]; // "Toad"
//seed = [[51,52], [50,51], [50,50], [51,50], [52,50]]; // "Glider"
//seed = [[25,26], [26,27], [27,25], [27,26], [27,27], [50,50], [50,51], [51,50], [52,53], [53,52], [53,53]]; // "Glider" collides with "Beacon" and explodes
//seed = [[50,40], [50,44], [50,45], [50,46], [51,39], [51,40], [52,45]]; // "Diehard"
//seed = [[40,40], [42,40], [42,41], [44,42], [44,43], [44,44], [46,43], [46,44], [46,45], [47,44]]; // Infinite growth
seed = [[49,49], [50,48], [50,49], [50,50], [51,50]]; // "R-pentomino"
//seed = [[47,51], [48,51], [48,53], [49,51], [49,52], [50,48], [51,49], [51,50], [52,48], [52,49]]; // "Two-glider mess"
//seed = [[47,50], [48,50], [49,50], [50,50], [51,50], [52,50], [53,50]]; // Becomes a "Honey farm"
//seed = [[,], [,], [,], [,], [,], [,]]; // Template

/**
 * Sets up some key variables that will be used later:
 *     drawSpace: DOM handle for the actual html drawing area
 *     gameBoard: A 2d array of ints that represents live and dead cells in the Game of Life
 * Seeds gameBoard with some live cells, and then draws the seed on the drawSpace.
 *
 * @return gameBoard Handle for the internal 2d array that handles live and dead cells
 */
function setUpGameBoard(onLoad=true) {
	if(onLoad) {
		// Get audio ready
		audio = new Audio("SmoothMcGroove_Zelda_DekuPalace.mp3");
		// Connect vars to the DOM
		htmlCanvasElement = document.getElementById("board");
		drawSpace = htmlCanvasElement.getContext("2d");
		// Give user play/pause functionality (space bar and canvas click)
		document.onkeydown = function(key) { if(key.keyCode == 32) playPause(); };
		htmlCanvasElement.addEventListener("click", playPause);
		// Set play speed
		delay = 1000 - (speed*10);
		document.getElementById("speed").innerHTML = speed;
		// Set up the internal 2d array and initialize it 
		gameBoard = new Array(boardDim);
		for(i=0; i<boardDim; i++) {
			gameBoard[i] = new Array(boardDim).fill(0);
		}
	}
	// Populate gameBoard with the seed
	for(i=0; i<seed.length; i++) {
		gameBoard[seed[i][0]][seed[i][1]] = 2;
	}
	updateCanvas();
}

/**
 * Handle the "Start" button.
 */
function playButton() {
	audio.play();
	gameLoop = setInterval(function() {
		transitionBoard()
		}, delay);
	isPaused = false;
}

/**
 * Handle the "Pause" button.
 */
function pauseButton() {
	audio.pause(); 
	clearTimeout(gameLoop);
	isPaused = true;
}

/**
 * Handle the "Mute/Unmute" button.
 */
function muteButton() {
	if(isMuted) {
		audio.muted = false; 
		isMuted = false;
	}
	else {
		audio.muted = true; 
		isMuted = true;
	}
}

/**
 * Used by event listeners to either play or pause.
 */
function playPause() {
	if(isPaused)
		playButton();
	else
		pauseButton();
}

/**
 * This is just a wrapper for two functions that are commonly called one after the other. In 
 * a later version, the two functions may be combined, or the first might call the second.
 */
function transitionBoard() {
	transformBoard();
	updateCanvas();
}


/**
 * Checks each cell in gameBoard and possibly changes it, using the 4 rules of the Game of 
 * Life. Normally, live cells have the value 1, and dead cells have the value 0. However, in 
 * this function, if a live cell dies, then its value is changed to -1, and if a dead cell is 
 * born, then its value is changed to 2. This is done because otherwise, when a cell looks at 
 * its neighbors, an earlier cell transformation could affect the count of how many neighbors 
 * the current cell has. As a side benefit, updateCanvas only has to redraw -1's and 2's.
 */
function transformBoard() {
	// Transform the current board
	for(let col=0; col<boardDim; col++) {
		for(let row=0; row<boardDim; row++) {
			/// Count the live neighbors ///
			numLiveNeighbors = 0;
			for(let i=col-1; i<col+2; i++) {
				for(let j=row-1; j<row+2; j++) {
					if(i<0 || j<0 || i>=boardDim || j>=boardDim || (i==col && j==row)) {
						// This square is either outside the board or is the current square, so skip it
					}
					else {
						if(gameBoard[i][j]==1 || gameBoard[i][j]==-1) {
							numLiveNeighbors ++;
						}
					}
				}
			}
			currentCell = gameBoard[col][row];
			/// Rule 1 ///
			if((currentCell==1 || currentCell==-1) && numLiveNeighbors<2) {
				gameBoard[col][row] = -1;
			}
			/// Rule 2 ///
			// Rule 2 needs no transformation
			/// Rule 3 ///
			if((currentCell==1 || currentCell==-1) && numLiveNeighbors>3) {
				gameBoard[col][row] = -1;
			}
			/// Rule 4 ///
			if((currentCell==0 || currentCell==2) && numLiveNeighbors==3) {
				gameBoard[col][row] = 2;
			}
		}
	}
	generation += 1;
	// Stable state was previously reached, so need to run all the stable state logic below
	if(stableStateReached)
		return;
	// Check for stable state
	tempGameBoard = JSON.stringify(gameBoard); // stringify gives fairly fast copy and compare runtimes
	if(tempGameBoard == gameBoard_2GenerationsBack) {
		document.getElementById("stableStateReached").innerHTML = "Stable state reached at " + (generation - 1) + " generations";
		stableStateReached = true;
	}
	// Copy gameBoard for future checks
	gameBoard_2GenerationsBack = gameBoard_prevGeneration;
	gameBoard_prevGeneration = tempGameBoard;
}

/**
 * Checks each cell in gameBoard. If the cell is -1, then this erases the corresponding 
 * square on drawSpace, and changes the cell to 0. If the cell is 2, then this draws the 
 * corresponding square on drawSpace, and changes the cell to 1.
 */
function updateCanvas() {
	for(col=0; col<boardDim; col++) {
		for(row=0; row<boardDim; row++) {
			let x = (col-5) * pixelsPerSide;
			let y = (row-5) * pixelsPerSide;
			if(gameBoard[col][row]==2) {
				// Draw a black square on the board, then set the value to 1
				drawSpace.fillStyle = "#000000";
				drawSpace.fillRect(x, y, pixelsPerSide, pixelsPerSide);
				gameBoard[col][row] = 1;
			}
			if(gameBoard[col][row]==-1) {
				// Draw a white square on the board, then set the value to 0
				drawSpace.fillStyle = "#FFFFFF";
				drawSpace.fillRect(x, y, pixelsPerSide, pixelsPerSide);
				gameBoard[col][row] = 0;
			}
			// else gameBoard[col][row] == 0 or 1, so take no action
		}
	}
	document.getElementById("textDisplayArea").innerHTML = "Generation: " + generation;
}

/**
 * Changes the speed of the transitionBoard loop, by transforming a user-defined speed into 
 * an equivalent delay. This interacts with the DOM in a way that allows the speed to be 
 * changed at any time (including while a game is active)
 */
function setSpeed() {
	pauseButton();
	speed = prompt("Enter the speed factor \n(a number between 0 and 100)", 80);
	if(speed.isNaN || speed < 0 || speed > 100) {
		alert("Invalid input (speed is unchanged)");
	}
	else {
		delay = 1000 - (speed*10);
		document.getElementById("speed").innerHTML = speed;
	}
	playButton();
}

/**
 * Clears the board, then creates and draws a random seed.
 */
function randomizeBoard() {
	let density = confirm("This action will reset your game. Is that ok?");
	if(!density)
		return;
	density = prompt("How dense would you like the live cells?\n(enter a percentage between 0 and 100)", 20);
	if(density.isNaN || density < 0 || density > 100) {
		alert("Invalid input (the board is unchanged)");
		return;
	}
	// Transform density from a percentage to a scalar
	density /= 100;
	// Clear the board
	for(let i=0; i<boardDim; i++) {
		for(let j=0; j<boardDim; j++) 
			gameBoard[i][j] = -1;
	}
	// This is where the magic happens
	for(col=0; col<boardDim; col++) {
		for(row=0; row<boardDim; row++) {
			if(Math.random() < density)
				gameBoard[col][row] = 2;
		}
	}
	updateCanvas();
}
