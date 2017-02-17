/*
TODOs:
	UX
		Improve overall L&F
	Controls
		Allow user to "draw" seed
		Randomize seed
			User-defined sparsity of live cells
		Save board states to file
			Read them back in
	Code org
		Create additional var for boardDim
	Misc
		Detect when stable state has been reached
		Explore Game variations 
		*Handle edge of board gracefully
Done:
	UX
		Play background music
			Pause music when game is paused
		Play/Pause by space bar
		Play/Pause by screen click
	Controls
		Randomize seed
		Control speed
		Reuse buttons (Step)
		Generation counter
	Code org
		Comment all functions
*/

// Globals 
var gameBoard = null;
var boardDim = 110; // leave a padding of 5 on each side
var pixelsPerSide = 5;
var drawSpace = null;
var audio = null;
var generation = 0;
var speed = 80;
var delay = 5;
var isPaused = false;
var game = null;
// The initial pattern (seed)
// (Uncomment the seed that you want to test)
//seed = [[50,49], [50,50], [50,51]]; // "Blinker"
//seed = [[3,1], [3,2], [3,3], [2,2], [2,3], [2,4]]; // "Toad"
//seed = [[51,52], [50,51], [50,50], [51,50], [52,50]]; // "Glider"
//seed = [[25,26], [26,27], [27,25], [27,26], [27,27], [50,50], [50,51], [51,50], [52,53], [53,52], [53,53]]; // "Glider" collides with "Beacon" and explodes
//seed = [[50,40], [50,44], [50,45], [50,46], [51,39], [51,40], [52,45]]; // "Diehard"
//seed = [[40,40], [42,40], [42,41], [44,42], [44,43], [44,44], [46,43], [46,44], [46,45], [47,44]]; // Infinite growth
//seed = [[49,49], [50,48], [50,49], [50,50], [51,50]]; // "R-pentomino"
seed = [[47,51], [48,51], [48,53], [49,51], [49,52], [50,48], [51,49], [51,50], [52,48], [52,49]]; // "Two-glider mess"
//seed = [[47,50], [48,50], [49,50], [50,50], [51,50], [52,50], [53,50]]; // Becomes a "Honey farm"
//seed = [[,], [,], [,], [,], [,], [,]]; // Template

/**
 * Sets up some key variables that will be used later:
 *     drawSpace: DOM handle for the actual html drawing area
 *     gameBoard: A 2d array of ints that represents live and dead cells in the Game of Life
 *     generation: How many iterations of the Game have been played
 * Seeds gameBoard with some live cells, and then draws the seed on the drawSpace.
 *
 * @param {number} boardDim The length (in cells) of one side of the gameBoard; this 
 *            dimension is used for both sides of the board, because all boards are square
 * @param {number} pixelsPerSide The pixel height of each cell on the gameBoard
 * @return gameBoard Handle for the internal 2d array that handles live and dead cells
 */
function setUpGameBoard() {
	// Get audio ready
	audio = new Audio("SmoothMcGroove_Zelda_DekuPalace.mp3");
	// Connect vars to the DOM
	htmlCanvasElement = document.getElementById("board");
	drawSpace = htmlCanvasElement.getContext("2d");
	// Give user play/pause functionality (space bar and canvas click)
	document.onkeydown = function(key) { if (key.keyCode == 32) playPause(); };
	htmlCanvasElement.addEventListener("click", playPause);
	// Set play speed
	delay = 1000 - (speed*10);
	document.getElementById("speed").innerHTML = speed;
	// Set up the internal 2d array and initialize it 
	//gameBoard = new Array(boardDim).fill(new Array(boardDim).fill(0));
	gameBoard = new Array(boardDim);
	for(i=0; i<boardDim; i++) {
		gameBoard[i] = new Array(boardDim);
		for(j=0; j<boardDim; j++) 
			gameBoard[i][j] = 0;
	}
	// Populate gameBoard with the seed
	for(i=0; i<seed.length; i++) {
		gameBoard[seed[i][0]][seed[i][1]] = 1;
	}
	// Draw the seed
	for(i=0; i<seed.length; i++) {
		x = (seed[i][0]-5) * pixelsPerSide;
		y = (seed[i][1]-5) * pixelsPerSide;
		drawSpace.fillRect(x,y,pixelsPerSide,pixelsPerSide);
	}
	// Change the button behaviour and return the board
	setUpButton = document.getElementById("setUp");
	setUpButton.onclick = transitionBoard;
	setUpButton.innerHTML = "Step";
}

/**
 * Handle the "Start" button.
 */
function playButton() {
	audio.play();
	game = setInterval(function() {
		transitionBoard()
		}, delay);
	isPaused = false;
}

/**
 * Handle the "Pause" button.
 */
function pauseButton() {
	audio.pause(); 
	clearTimeout(game);
	isPaused = true;
}

/**
 * Used by event listeners to either play or pause.
 */
function playPause() {
	if (isPaused)
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
 *
 * @param gameBoard The internal 2d array that handles live and dead cells
 * @param {number} boardDim The length (in cells) of one side of the gameBoard
 * @return gameBoard This is returned for formality; the gameBoard that is passed in actually
 *             changes
 */
function transformBoard() {
	for(col=0; col<boardDim; col++) {
		for(row=0; row<boardDim; row++) {
			/// Count the live neighbors ///
			liveNeighbors = 0;
			for(i=col-1; i<col+2; i++) {
				for(j=row-1; j<row+2; j++) {
					if(i<0 || j<0 || i>=boardDim || j>=boardDim || (i==col&&j==row)) {
						// This square is either outside the board or is the current square, 
						// so skip it
					}
					else {
						if(gameBoard[i][j]==1 || gameBoard[i][j]==-1) {
							liveNeighbors ++;
						}
					}
				}
			}
			currentCell = gameBoard[col][row];
			/// Rule 1 ///
			if((currentCell==1||currentCell==-1) && liveNeighbors<2) {
				gameBoard[col][row] = -1;
			}
			// Rule 2 needs no transformation
			/// Rule 3 ///
			if((currentCell==1||currentCell==-1) && liveNeighbors>3) {
				gameBoard[col][row] = -1;
			}
			/// Rule 4 ///
			if((currentCell==0||currentCell==2) && liveNeighbors==3) {
				gameBoard[col][row] = 2;
			}
		}
	}
	generation += 1;
}

/**
 * Checks each cell in gameBoard. If the cell is -1, then this erases the corresponding 
 * square on drawSpace, and changes the cell to 0. If the cell is 2, then this draws the 
 * corresponding square on drawSpace, and changes the cell to 1.
 *
 * @param gameBoard The internal 2d array that handles live and dead cells
 * @param {number} boardDim The length (in cells) of one side of the gameBoard
 * @param {number} pixelsPerSide The pixel height of each cell on the gameBoard
 * @param drawSpace Html DOM handle for the drawing area
 */
function updateCanvas() {
	for(col=5; col<boardDim-5; col++) {
		for(row=5; row<boardDim-5; row++) {
			var x = (col-5) * pixelsPerSide;
			var y = (row-5) * pixelsPerSide;
			if(gameBoard[col][row]==2) {
				// Draw a black square on the board, then set the value to 1
				drawSpace.fillRect(x,y,pixelsPerSide,pixelsPerSide);
				gameBoard[col][row] = 1;
			}
			if(gameBoard[col][row]==-1) {
				// Draw a white square on the board, then set the value to 0
				drawSpace.fillStyle = "#FFFFFF";
				drawSpace.fillRect(x,y,pixelsPerSide,pixelsPerSide);
				drawSpace.fillStyle = "#000000";
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
 * changed either:
 *    1) immediately after the page launches.
 *    2) after painting and/or altering the seed.
 *    3) during program execution (to do this, pause execution, change speed, then restart).
 */
function setSpeed() {
	speed = prompt("Enter the time delay in milliseconds\n(enter a number between 0 and 99)", 80);
	delay = 1000 - (speed*10);
	document.getElementById("speed").innerHTML = speed;
}

/**
 * Creates a random seed.
 */
function randomizeBoard() {
	sparcityFactor = .2;
	for(col=0; col<boardDim; col++) {
		for(row=0; row<boardDim; row++) {
			toMakeLive = Math.random();
			if(toMakeLive<sparcityFactor)
				seed.push([col,row]);
		}
	}
	setUpGameBoard(boardDim, pixelsPerSide);
}
