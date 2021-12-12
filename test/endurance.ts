import {Game} from "../src";

describe("Endurance tests", () => {
    const numHoursTrials: number[] = [
        1,
        2,
        4,
        // 8,
        // 24,
        // 3 * 24,
        // 7 * 24
    ];
    for (const numHours of numHoursTrials) {
        it(`should run for ${numHours} hour without crashing`, function () {
            this.timeout(numHours * 60 * 60 * 1000);

            const game = new Game();
            game.initializeGame();
            for (let i = 0; i < numHours * 60 * 60 * 10; i++) {
                game.handleServerLoop();
                game.outgoingMessages.splice(0, game.outgoingMessages.length);
            }
        });
    }
});