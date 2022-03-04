import "mocha";
import {config, expect} from "chai";
import {Faction, Game, Planet, Ship, VoronoiTerrain} from "../src";
import {CannonBall, Crate} from "../src/Item";
import {EResourceType} from "../src/Resource";
import {
    EMessageType,
    IChooseFactionMessage,
    IChoosePlanetMessage,
    IJoinMessage,
    IPlayerData,
    ISpawnMessage
} from "../src/Game";
import {EShipType} from "../src/ShipType";
import {EFaction} from "../src/EFaction";

// force verbose deep equal
config.truncateThreshold = 0;

describe("network serialization", () => {
    const game: Game = new Game();
    game.initializeGame();
    it("Faction", () => {
        for (const a of game.factions.values()) {
            const b = Faction.deserialize(game, a.serialize());
            expect(a.serialize()).to.deep.equal(b.serialize());
            expect(a).to.deep.equal(b);
        }
    });
    it("Planet", () => {
        for (const [, a] of game.planets) {
            const b = Planet.deserialize(game, a.county, a.serialize());
            expect(a.serialize()).to.deep.equal(b.serialize());
        }
    });
    it("VoronoiTerrain", () => {
        const a = game.voronoiTerrain;
        const b = VoronoiTerrain.deserialize(game, a.serialize());
        expect(a.serialize()).to.deep.equal(b.serialize());
    });
    it("VoronoiTerrain with function call", () => {
        const a = game.voronoiTerrain;
        const b = VoronoiTerrain.deserialize(game, JSON.parse(JSON.stringify(a.serialize())));
        b.kingdoms[0].voronoiCell.containsPoint([0, 0, 1]);
    });
    it("Ship", () => {
        const a = new Ship(game, EShipType.CUTTER);
        const b = Ship.deserialize(game, a.serialize());
        expect(a.serialize()).to.deep.equal(b.serialize());
        expect(a).to.deep.equal(b);
    });
    it("CannonBall", () => {
        const a = new CannonBall(EFaction.DUTCH, "test");
        const b = CannonBall.deserialize(a.serialize());
        expect(a.serialize()).to.deep.equal(b.serialize());
        expect(a).to.deep.equal(b);
    });
    it("Crate", () => {
        const a = new Crate(EResourceType.RUM, game.factions.get(EFaction.DUTCH).homeWorldPlanetId, 1);
        const b = Crate.deserialize(a.serialize());
        expect(a.serialize()).to.deep.equal(b.serialize());
        expect(a).to.deep.equal(b);
    });
    it("Initialize", () => {
        const game2 = new Game();
        game2.applyGameInitializationFrame(game.getInitializationFrame());
    });
    const shouldSpawnShip = (networkGame: Game): IPlayerData => {
        // pick name
        const loginMessage: IJoinMessage = {
            messageType: EMessageType.JOIN,
            name: "test"
        };
        networkGame.incomingMessages.push(["test", loginMessage]);
        networkGame.handleServerLoop();
        const playerData = Array.from(networkGame.playerData.values())[0];
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
        const shipType = networkGame.getSpawnLocations(playerData).results[0].shipType;
        const spawn: ISpawnMessage = {
            messageType: EMessageType.SPAWN,
            planetId,
            shipType
        };
        networkGame.incomingMessages.push(["test", spawn]);
        networkGame.handleServerLoop();

        return playerData;
    };
    it("Low enough idle internet to handle 56kbps internet connection", function () {
        this.timeout(30 * 1000);
        const networkGame = new Game();
        networkGame.initializeGame();

        const playerData = shouldSpawnShip(networkGame);
        let shipPosition: [number, number, number] =
            networkGame.ships.get(playerData.shipId).position.rotateVector([0, 0, 1]);

        let byteCount: number = 0;
        const bytesPerField: Map<string, number> = new Map<string, number>();
        networkGame.voronoiTerrain.getClientFrame(playerData, shipPosition);
        networkGame.handleServerLoop();

        for (let i = 0; i < 20; i++) {
            shipPosition =
                networkGame.ships.get(playerData.shipId).position.rotateVector([0, 0, 1]);
            const data = networkGame.voronoiTerrain.getClientFrame(playerData, shipPosition);
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
        expect(byteCount).to.be.lessThan(56 * 1024 / 8);
    });
    it("Low enough idle internet to handle 128kbps internet connection after 10 minutes", function () {
        this.timeout(10 * 60 * 1000);
        const networkGame = new Game();
        networkGame.initializeGame();

        const playerData = shouldSpawnShip(networkGame);
        let shipPosition: [number, number, number] =
            networkGame.ships.get(playerData.shipId).position.rotateVector([0, 0, 1]);

        let byteCount: number = 0;
        const bytesPerField: Map<string, number> = new Map<string, number>();
        for (let i = 0; i < 10 * 60 * 10; i++) {
            // spin up 10 minutes, then measure internet
            networkGame.voronoiTerrain.getClientFrame(playerData, shipPosition);
            networkGame.handleServerLoop();
            networkGame.outgoingMessages.splice(0, networkGame.outgoingMessages.length);
        }

        for (let i = 0; i < 20; i++) {
            shipPosition =
                networkGame.ships.get(playerData.shipId).position.rotateVector([0, 0, 1]);
            const data = networkGame.voronoiTerrain.getClientFrame(playerData, shipPosition);
            byteCount = JSON.stringify(data).length;
            for (const [key, value] of Object.entries(data)) {
                if (bytesPerField.has(key)) {
                    bytesPerField.set(key, bytesPerField.get(key) + JSON.stringify(value).length);
                } else {
                    bytesPerField.set(key, JSON.stringify(value).length);
                }
            }
            networkGame.handleServerLoop();
            networkGame.outgoingMessages.splice(0, networkGame.outgoingMessages.length);
        }
        expect(byteCount).to.be.lessThan(128 * 1024 / 8);
    });
    it("Low enough idle internet to handle 128kbps internet connection after 30 minutes", function () {
        this.timeout(10 * 60 * 1000);
        const networkGame = new Game();
        networkGame.initializeGame();

        const playerData = shouldSpawnShip(networkGame);
        let shipPosition: [number, number, number] =
            networkGame.ships.get(playerData.shipId).position.rotateVector([0, 0, 1]);

        let byteCount: number = 0;
        const bytesPerField: Map<string, number> = new Map<string, number>();
        for (let i = 0; i < 30 * 60 * 10; i++) {
            // spin up 30 minutes, then measure internet
            networkGame.voronoiTerrain.getClientFrame(playerData, shipPosition);
            networkGame.handleServerLoop();
            networkGame.outgoingMessages.splice(0, networkGame.outgoingMessages.length);
        }

        for (let i = 0; i < 20; i++) {
            shipPosition =
                networkGame.ships.get(playerData.shipId).position.rotateVector([0, 0, 1]);
            const data = networkGame.voronoiTerrain.getClientFrame(playerData, shipPosition);
            byteCount = JSON.stringify(data).length;
            for (const [key, value] of Object.entries(data)) {
                if (bytesPerField.has(key)) {
                    bytesPerField.set(key, bytesPerField.get(key) + JSON.stringify(value).length);
                } else {
                    bytesPerField.set(key, JSON.stringify(value).length);
                }
            }
            networkGame.handleServerLoop();
            networkGame.outgoingMessages.splice(0, networkGame.outgoingMessages.length);
        }
        expect(byteCount).to.be.lessThan(128 * 1024 / 8);
    });
    it("should delta compress information that's the same", function () {
        this.timeout(30 * 1000);
        const networkGame = new Game();
        networkGame.initializeGame();

        const playerData = shouldSpawnShip(networkGame);
        let shipPosition: [number, number, number] =
            networkGame.ships.get(playerData.shipId).position.rotateVector([0, 0, 1]);
        networkGame.voronoiTerrain.getClientFrame(playerData, shipPosition);

        for (let i = 0; i < 20; i++) {
            shipPosition =
                networkGame.ships.get(playerData.shipId).position.rotateVector([0, 0, 1]);
            const data = networkGame.voronoiTerrain.getClientFrame(playerData, shipPosition);
            const byteCount = JSON.stringify(data).length;
            expect(byteCount).to.be.lessThan(250);
        }
    });
});