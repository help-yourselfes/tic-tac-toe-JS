// turns: user(x) -> enemy(o)

const Game = new class {
    constructor() {
        this.restart();
        this.user = new this.Player('x');
        this.enemy = new this.Player('o');

        this.enemy.oldPlace = (new this.Player(this.enemy.symbol)).place;

        this.enemy.place = () => {
            const userLastTileID = Game.user.tile.y * this.board.size + Game.user.tile.x;
            let solutions = [];

            // (horizontal -> vertical) line check
            // first iteration: horizontal
            // the second: vertical
            let iteration = 0;
            while (iteration < 2) {
                for (let i = 0; i < this.board.size; i++) {
                    let user = 0;
                    let enemy = 0;
                    let freeTile = { empty: true };
                    for (let j = 0; j < this.board.size; j++) {
                        let x = iteration === 0 ? i : j;
                        let y = iteration === 0 ? j : i;
                        switch (Game.board.getTile(x, y)) {
                            case Game.user.symbol:
                                user++;
                                break;
                            case Game.enemy.symbol:
                                enemy++;
                                break;
                            default:
                                freeTile = { x: x, y: y }
                                break;
                        }
                    }
                    if (enemy > 1 && !freeTile.empty) solutions.unshift(
                        { x: freeTile.x, y: freeTile.y, type: 'attack' })
                    if (user > 1 && !freeTile.empty) solutions.push(freeTile)

                }
                iteration++;
            }

            // diagonal line check
            {
                const diagonals = [[0, 4, 8], [2, 4, 6]];
                for (let diagonal of diagonals) {
                    let user = 0;
                    let enemy = 0;
                    let freeTile = { empty: true };
                    for (let tile of diagonal) {

                        switch (this.board.getTileByID(tile)) {
                            case Game.user.symbol:
                                user++;
                                break;
                            case Game.enemy.symbol:
                                enemy++;
                                break;
                            case '':
                                freeTile = { x: tile % this.board.size, y: Math.floor(tile / this.board.size) }
                                break;
                        }
                    }
                    if (enemy > 1 && !freeTile.empty) {
                        solutions.unshift(
                            { x: freeTile.x, y: freeTile.y, type: 'attack' })
                    }
                    if (user > 1 && !freeTile.empty) { solutions.push(freeTile) }
                }
            }

            let decision = Game.board.freeTile;


            if (solutions) {
                // checks for solition truthfulness.
                // solutions, that was added throuh unshift() are attacks
                // solutions, that was added throuh push() are defends
                for (let solution of solutions) {
                    if (!solution.empty && !Game.board.getTile(solution.x, solution.y)) {
                        decision = solution;
                        break;
                    }
                }
            }

            if (decision.empty) decision = Game.board.freeTile;
            return this.enemy.oldPlace(decision.x, decision.y);;

        }

        this.state.turn = 0;
    }

    restart() {
        this.state = {
            gameOver: false,
            turn: 0,
        }
        this.initialiseBoard();
    }

    Player = class {
        score; symbol;
        tile;
        constructor(symbol) {
            this.score = 0;
            this.symbol = symbol;
        }
        place(x, y) {
            if (Game.board.getTile(x, y) || Game.state.gameOver) return false;

            Game.board.tiles[y * 3 + x] = this.symbol;
            Game.state.turn++;

            UI.board.getButton(x, y).update(this.symbol);

            const result = Game.result(x, y);
            if (result) {
                if (result === this.symbol) this.score++;
                Animation.isPlaying = true;
                setTimeout(() => {
                    UI.displayResult(result);
                    Animation.isPlaying = false;

                }, UI.Animation.speed);

            }


            this.tile = { x: x, y: y };
            return true;
        }
    }



    result(x, y) {
        if (this.state.turn < 5) return null;

        const symbol = this.board.getTile(x, y);
        let avaibleWins = [];
        this.board.winConditions.forEach(win => {
            if (win.includes(y * this.board.size + x)) avaibleWins.push(win);
        });
        this.state.gameOver = true;
        let totalWin = 0;
        for (let win of avaibleWins) {
            for (let tile of win) {
                if (this.board.tiles[tile] === symbol) totalWin++
            }
            if (totalWin < 3) totalWin = 0
            else return symbol;
        }

        if (this.state.turn === 9) return 'draw'
        this.state.gameOver = false;


    }

    initialiseBoard() {
        this.board = {
            size: 3,
            tiles: [],
            winConditions: [
                [0, 1, 2],    //  *---*---*---*
                [3, 4, 5],    //  | 0 | 1 | 2 |
                [6, 7, 8],    //  *---*---*---*
                [0, 3, 6],    //  | 3 | 4 | 5 |
                [2, 5, 8],    //  *---*---*---*
                [1, 4, 7],    //  | 6 | 7 | 8 |
                [0, 4, 8],    //  *---*---*---*
                [2, 4, 6]
            ],

            getTile(x, y) {
                return this.getTileByID(y * 3 + x);
            },

            getTileByID(id) {
                return this.tiles[id];
            },

            get freeTile() {
                let tile = {
                    x: Math.floor(Math.random() * 3),
                    y: Math.floor(Math.random() * 3)
                };
                if (Game.state.turn < 9)
                    while (this.getTile(tile.x, tile.y)) {
                        tile = {
                            x: Math.floor(Math.random() * 3),
                            y: Math.floor(Math.random() * 3)
                        };
                    }
                return tile;
            }

        };


        for (let i = 0; i < 9; i++) {
            this.board.tiles.push('');
        }
    }
}

const UI = new class {
    Animation = {
        isPlaying: false,
        speed: 350,
    };

    constructor() {
        this.createBoard();
        this.DOMcache();

    }

    DOMcache() {
        this.templates = {
            x: document.getElementById('x-template').content,
            o: document.getElementById('o-template').content,
            button: document.getElementById('button-template').content,
        };

        this.board.Element = document.getElementById('board');
        this.restart = document.getElementById('restart');
        this.score = {
            user: document.getElementById('user'),
            enemy:document.getElementById('enemy')
        }

        this.score.user.className='user-score';
        this.score.enemy.className='enemy-score';
        this.restart.addEventListener('click', () => {
            Game.restart();

            this.board.Element.classList = '';
            this.board.buttons.forEach((button) => {
                button.Element.innerHTML = '';
                button.Element.classList = 'board-button';
            });

        });
    }

    createBoard() {
        this.board = {
            Element: '', buttons: [], getButton(x, y) {
                return this.buttons[y * 3 + x];
            }
        };
        this.board.initialise = () => {
            this.board.Element.innerHTML = '';
            this.board.buttons = [];
            for (let y = 0; y < 3; y++) {
                const row = document.createElement('div');
                row.className = 'board-row';
                for (let x = 0; x < 3; x++) {
                    let button = {
                        Element: UI.templates.button.cloneNode(true).querySelector('.board-button'),
                        display() { }
                    };
                    button.Element.innerHTML = '';
                    button.x = x;
                    button.y = y;
                    row.appendChild(button.Element);
                    this.board.buttons.push(button);
                }

                this.board.Element.appendChild(row);
            }

            this.board.buttons.forEach((button) => {
                button.Element.addEventListener('click', () => {
                    if (!this.Animation.isPlaying)
                    if (Game.user.place(button.x, button.y)) {
                        this.Animation.isPlaying = true;
                        setTimeout(() => {
                            Game.enemy.place();
                            this.Animation.isPlaying = false;
                        }, this.Animation.speed);
                    }
                });
                button.update = (symbol) => {
                    const buttonElement = button.Element;
                    buttonElement.innerHTML = ' ';
                    buttonElement.appendChild(this.templates[symbol].cloneNode(true))
                    buttonElement.classList.add(symbol === 'x' ? 'board-button--x' : 'board-button--o');
                }
            });
        };
    }

    displayResult(symbol) {
        this.board.buttons.forEach((button) => {
            button.Element.classList.add('board-button--collapsed');
        });
        this.score.user.textContent = Game.user.score;
        this.score.enemy.textContent= Game.enemy.score;
        this.board.Element.classList.add(symbol);
    }
};

Game.initialiseBoard();
UI.board.initialise();