import {Game} from "../src";
import {EFaction} from "../src/EFaction";
import {expect} from "chai";

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
            let hasShips: Record<EFaction, boolean> = {
                [EFaction.DWARVEN]: false,
                [EFaction.ELVEN]: false,
                [EFaction.HUMAN]: false,
                [EFaction.ORCISH]: false,
            };
            for (let i = 0; i < numHours * 60 * 60 * 10; i++) {
                game.handleServerLoop();
                game.outgoingMessages.splice(0, game.outgoingMessages.length);
                for (const key in hasShips) {
                    if (hasShips[key] !== true && Array.from(game.ships.values()).filter(s => s.faction.id === key).length > 5) {
                        hasShips[key] = true;
                    }
                }
            }
            expect(hasShips).to.deep.equal({
                [EFaction.DWARVEN]: true,
                [EFaction.ELVEN]: true,
                [EFaction.HUMAN]: true,
                [EFaction.ORCISH]: true,
            });
        });
    }
});