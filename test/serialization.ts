import "mocha";
import {config, expect} from "chai";
import {Faction, Game, Planet, Ship, VoronoiTerrain} from "../src";
import {EFaction, EShipType} from "../src/Ship";
import {CannonBall, Crate} from "../src/Item";
import {EResourceType} from "../src/Resource";
import {EMessageType, IChooseFactionMessage, IChoosePlanetMessage, IJoinMessage, ISpawnMessage} from "../src/Game";

// force verbose deep equal
config.truncateThreshold = 0;

describe("network serialization", () => {
    const game: Game = new Game();
    game.initializeGame();
    it("Faction", () => {
        for (const a of Object.values(game.factions)) {
            const b = Faction.deserialize(game, a.serialize());
            expect(a.serialize()).to.deep.equal(b.serialize());
            expect(a).to.deep.equal(b);
        }
    });
    it("Planet", () => {
        for (const a of game.planets) {
            const b = Planet.deserialize(game, a.county, a.serialize());
            expect(a.serialize()).to.deep.equal(b.serialize());
        }
    });
    it("VoronoiTerrain", () => {
        const a = game.voronoiTerrain;
        const b = VoronoiTerrain.deserialize(game, a.serialize());
        expect(a.serialize()).to.deep.equal(b.serialize());
    });
    it("Ship", () => {
        const a = new Ship(game, EShipType.CUTTER);
        const b = Ship.deserialize(game, a.serialize());
        expect(a.serialize()).to.deep.equal(b.serialize());
        expect(a).to.deep.equal(b);
    });
    it("CannonBall", () => {
        const a = new CannonBall(EFaction.DUTCH);
        const b = CannonBall.deserialize(a.serialize());
        expect(a.serialize()).to.deep.equal(b.serialize());
        expect(a).to.deep.equal(b);
    });
    it("Crate", () => {
        const a = new Crate(EResourceType.RUM, game.factions[EFaction.DUTCH].homeWorldPlanetId, 1);
        const b = Crate.deserialize(a.serialize());
        expect(a.serialize()).to.deep.equal(b.serialize());
        expect(a).to.deep.equal(b);
    });
    it("Initialize", () => {
        const game2 = new Game();
        game2.applyGameInitializationFrame(game.getInitializationFrame());
    });
    it("Low enough idle internet to handle 128kbps internet connection", function () {
        this.timeout(30 * 1000);
        const networkGame = new Game();
        networkGame.initializeGame();

        // pick name
        const loginMessage: IJoinMessage = {
            messageType: EMessageType.JOIN,
            name: "test"
        };
        networkGame.incomingMessages.push(["test", loginMessage]);
        networkGame.handleServerLoop();
        const playerData = networkGame.playerData[0];
        expect(playerData).not.equal(undefined);

        // pick faction
        const factionMessage: IChooseFactionMessage = {
            messageType: EMessageType.CHOOSE_FACTION,
            factionId: EFaction.DUTCH
        };
        networkGame.incomingMessages.push(["test", factionMessage]);
        networkGame.handleServerLoop();

        // pick planet
        const planetId = networkGame.getSpawnPlanets(playerData)[0].planetId;
        const planetMessage: IChoosePlanetMessage = {
            messageType: EMessageType.CHOOSE_PLANET,
            planetId
        };
        networkGame.incomingMessages.push(["test", planetMessage]);
        networkGame.handleServerLoop();

        // pick ship
        const shipType = networkGame.getSpawnLocations(playerData)[0].shipType;
        const spawn: ISpawnMessage = {
            messageType: EMessageType.SPAWN,
            planetId,
            shipType
        };
        networkGame.incomingMessages.push(["test", spawn]);
        networkGame.handleServerLoop();

        let byteCount: number = 0;
        const bytesPerField: Map<string, number> = new Map<string, number>();
        for (let i = 0; i < 20; i++) {
            const data = networkGame.getSyncFrame(playerData);
            byteCount = JSON.stringify(data).length;
            for (const [key, value] of Object.entries(data)) {
                if (bytesPerField.has(key)) {
                    bytesPerField.set(key, bytesPerField.get(key) + JSON.stringify(value).length);
                } else {
                    bytesPerField.set(key, JSON.stringify(value).length);
                }
            }
            networkGame.handleServerLoop();
        }
        expect(byteCount).to.be.lessThan(128 * 1024 / 8);
    });
});