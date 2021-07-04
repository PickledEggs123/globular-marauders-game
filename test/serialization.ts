import "mocha";
import {config, expect} from "chai";
import {Faction, Game, Planet, Ship, VoronoiTerrain} from "../src";
import {EFaction, EShipType} from "../src/Ship";
import {CannonBall, Crate} from "../src/Item";
import {EResourceType} from "../src/Resource";

// force verbose deep equal
config.truncateThreshold = 0;

describe("network serialization", () => {
    const game: Game = new Game();
    game.initializeGame();
    it("Faction", () => {
        for (const a of Object.values(game.factions)) {
            const b = Faction.deserialize(game, a.serialize());
            expect(a.serialize()).to.deep.equal(b.serialize());
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
    });
    it("CannonBall", () => {
        const a = new CannonBall(EFaction.DUTCH);
        const b = CannonBall.deserialize(a.serialize());
        expect(a.serialize()).to.deep.equal(b.serialize());
    });
    it("Crate", () => {
        const a = new Crate(EResourceType.RUM, game.factions[EFaction.DUTCH].homeWorldPlanetId, 1);
        const b = Crate.deserialize(a.serialize());
        expect(a.serialize()).to.deep.equal(b.serialize());
    });
    it("Initialize", () => {
        const game2 = new Game();
        game2.applyGameInitializationFrame(game.getInitializationFrame());
    });
});