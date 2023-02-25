import {Game} from "../src";
import {EFaction} from "../src/EFaction";
import {CharacterBattle} from "../src/Character";

describe("Character Battle", () => {
    it("should run a character battle", () => {
        const game = new Game();
        game.initializeGame();

        let characterBattle: CharacterBattle | null = null;

        for (let i = 0; i < 60 * 60 * 10; i++) {
            game.handleServerLoop();
            game.outgoingMessages.splice(0, game.outgoingMessages.length);
            const dwarfShip = Array.from(game.ships.values()).find(x => x.faction.id === EFaction.ELVEN);
            const orcShip = Array.from(game.ships.values()).find(x => x.faction.id === EFaction.ORCISH);

            if (dwarfShip && orcShip && !characterBattle) {
                characterBattle = new CharacterBattle(game, [dwarfShip, orcShip]);
                game.characterBattles.set(characterBattle.id, characterBattle);
            }
            if (characterBattle && game.characterBattles.has(characterBattle.id)) {
                console.log(dwarfShip.characters.map(c => c.hp), orcShip.characters.map(c => c.hp));
            }
            if (characterBattle && !game.characterBattles.has(characterBattle.id)) {
                break;
            }
        }
    });
});