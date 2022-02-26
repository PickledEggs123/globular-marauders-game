import {Game} from "../src";
import {expect} from "chai";
import {EFaction} from "../src/EFaction";

describe("faction", () => {
    describe("faction royal titles", () => {
        it("should be count", function () {
            this.timeout(5000);

            const game: Game = new Game();
            game.initializeGame();

            const factionId = EFaction.DUTCH;
            const homeWorldPlanetId = game.factions.get(factionId).homeWorldPlanetId;
            const homeWorld = game.planets.get(homeWorldPlanetId);
            const kingdomId = homeWorld.county.duchy.kingdom.capital.capital.capital.id;
            const duchyId = homeWorld.county.duchy.capital.capital.id;
            const countyId = homeWorld.county.capital.id;
            const playerId = "test";
            homeWorld.county.duchy.counties.forEach(p => p.claim(game.factions.get(factionId)));
            game.factions.get(factionId).factionPlanetRoster.push({
                factionId,
                kingdomId,
                duchyId,
                countyId,
                playerId,
            });
            game.factions.get(factionId).handleFactionLoop();
            expect(game.factions.get(factionId).factionPlayerRoyalTitles).to.deep.equal({
                counts: [{planetId: countyId, playerId}],
                barons: [],
                dukes: [],
                archDukes: [],
                kings: [],
                emperors: [],
            });
        });
        it("should be baron", function () {
            this.timeout(5000);

            const game: Game = new Game();
            game.initializeGame();

            const factionId = EFaction.DUTCH;
            const homeWorldPlanetId = game.factions.get(factionId).homeWorldPlanetId;
            const homeWorld = game.planets.get(homeWorldPlanetId);
            const kingdomId = homeWorld.county.duchy.kingdom.capital.capital.capital.id;
            const duchyId = homeWorld.county.duchy.capital.capital.id;
            const countyId = homeWorld.county.capital.id;
            const playerId = "test";
            homeWorld.county.duchy.counties.forEach(p => p.claim(game.factions.get(factionId)));
            game.factions.get(factionId).factionPlanetRoster.push({
                factionId,
                kingdomId,
                duchyId,
                countyId,
                playerId,
            }, {
                factionId,
                kingdomId,
                duchyId,
                countyId: homeWorld.county.duchy.counties.filter(c => c.capital.id !== countyId)[0].capital.id,
                playerId,
            });
            game.factions.get(factionId).handleFactionLoop();
            expect(game.factions.get(factionId).factionPlayerRoyalTitles).to.deep.equal({
                counts: [{
                    planetId: countyId,
                    playerId,
                }, {
                    planetId: homeWorld.county.duchy.counties.filter(c => c.capital.id !== countyId)[0].capital.id,
                    playerId,
                }],
                barons: [{planetId: duchyId, playerId}],
                dukes: [],
                archDukes: [],
                kings: [],
                emperors: [],
            });
        });
        it("should be duke", function () {
            this.timeout(5000);

            const game: Game = new Game();
            game.initializeGame();

            const factionId = EFaction.DUTCH;
            const homeWorldPlanetId = game.factions.get(factionId).homeWorldPlanetId;
            const homeWorld = game.planets.get(homeWorldPlanetId);
            const kingdomId = homeWorld.county.duchy.kingdom.capital.capital.capital.id;
            const duchyId = homeWorld.county.duchy.capital.capital.id;
            const countyId = homeWorld.county.capital.id;
            const playerId = "test";
            homeWorld.county.duchy.counties.forEach(p => p.claim(game.factions.get(factionId)));
            game.factions.get(factionId).factionPlanetRoster.push({
                factionId,
                kingdomId,
                duchyId,
                countyId,
                playerId,
            }, {
                factionId,
                kingdomId,
                duchyId,
                countyId: homeWorld.county.duchy.counties.filter(c => c.capital.id !== countyId)[0].capital.id,
                playerId,
            }, {
                factionId,
                kingdomId,
                duchyId,
                countyId: homeWorld.county.duchy.counties.filter(c => c.capital.id !== countyId)[1].capital.id,
                playerId,
            });
            game.factions.get(factionId).handleFactionLoop();
            expect(game.factions.get(factionId).factionPlayerRoyalTitles).to.deep.equal({
                counts: [{
                    planetId: countyId,
                    playerId
                }, {
                    planetId: homeWorld.county.duchy.counties.filter(c => c.capital.id !== countyId)[0].capital.id,
                    playerId,
                }, {
                    planetId: homeWorld.county.duchy.counties.filter(c => c.capital.id !== countyId)[1].capital.id,
                    playerId,
                }],
                barons: [],
                dukes: [{planetId: duchyId, playerId}],
                archDukes: [],
                kings: [],
                emperors: []
            });
        });
        it("should be arch duke", function () {
            this.timeout(5000);

            const game: Game = new Game();
            game.initializeGame();

            const factionId = EFaction.DUTCH;
            const homeWorldPlanetId = game.factions.get(factionId).homeWorldPlanetId;
            const homeWorld = game.planets.get(homeWorldPlanetId);
            const kingdomId = homeWorld.county.duchy.kingdom.capital.capital.capital.id;
            const duchyId = homeWorld.county.duchy.capital.capital.id;
            const countyId = homeWorld.county.capital.id;
            const playerId = "test";
            homeWorld.county.duchy.kingdom.duchies.forEach(d => d.counties.forEach(p => p.claim(game.factions.get(factionId))));
            game.factions.get(factionId).factionPlanetRoster.push({
                factionId,
                kingdomId,
                duchyId,
                countyId,
                playerId,
            }, {
                factionId,
                kingdomId,
                duchyId,
                countyId: homeWorld.county.duchy.counties.filter(c => c.capital.id !== countyId)[0].capital.id,
                playerId,
            }, {
                factionId,
                kingdomId,
                duchyId,
                countyId: homeWorld.county.duchy.counties.filter(c => c.capital.id !== countyId)[1].capital.id,
                playerId,
            }, {
                factionId,
                kingdomId,
                duchyId: homeWorld.county.duchy.kingdom.duchies.filter(d => d.capital.capital.id !== duchyId)[0].capital.capital.id,
                countyId: homeWorld.county.duchy.kingdom.duchies.filter(d => d.capital.capital.id !== duchyId)[0].capital.capital.id,
                playerId,
            });
            game.factions.get(factionId).handleFactionLoop();
            expect(game.factions.get(factionId).factionPlayerRoyalTitles).to.deep.equal({
                counts: [{
                    planetId: countyId,
                    playerId
                }, {
                    planetId: homeWorld.county.duchy.counties.filter(c => c.capital.id !== countyId)[0].capital.id,
                    playerId,
                }, {
                    planetId: homeWorld.county.duchy.counties.filter(c => c.capital.id !== countyId)[1].capital.id,
                    playerId,
                }, {
                    planetId: homeWorld.county.duchy.kingdom.duchies.filter(d => d.capital.capital.id !== duchyId)[0].capital.capital.id,
                    playerId,
                }],
                barons: [],
                dukes: [{
                    planetId: duchyId,
                    playerId,
                }],
                archDukes: [{
                    planetId: kingdomId,
                    playerId,
                }],
                kings: [],
                emperors: []
            });
        });
        it("should be king", function () {
            this.timeout(5000);

            const game: Game = new Game();
            game.initializeGame();

            const factionId = EFaction.DUTCH;
            const homeWorldPlanetId = game.factions.get(factionId).homeWorldPlanetId;
            const homeWorld = game.planets.get(homeWorldPlanetId);
            const kingdomId = homeWorld.county.duchy.kingdom.capital.capital.capital.id;
            const duchyId = homeWorld.county.duchy.capital.capital.id;
            const countyId = homeWorld.county.capital.id;
            const playerId = "test";
            homeWorld.county.duchy.kingdom.duchies.forEach(d => d.counties.forEach(p => p.claim(game.factions.get(factionId))));
            game.factions.get(factionId).factionPlanetRoster.push({
                factionId,
                kingdomId,
                duchyId,
                countyId,
                playerId,
            }, {
                factionId,
                kingdomId,
                duchyId,
                countyId: homeWorld.county.duchy.counties.filter(c => c.capital.id !== countyId)[0].capital.id,
                playerId,
            }, {
                factionId,
                kingdomId,
                duchyId,
                countyId: homeWorld.county.duchy.counties.filter(c => c.capital.id !== countyId)[1].capital.id,
                playerId,
            }, {
                factionId,
                kingdomId,
                duchyId: homeWorld.county.duchy.kingdom.duchies.filter(d => d.capital.capital.id !== duchyId)[0].capital.capital.id,
                countyId: homeWorld.county.duchy.kingdom.duchies.filter(d => d.capital.capital.id !== duchyId)[0].capital.capital.id,
                playerId,
            }, {
                factionId,
                kingdomId,
                duchyId: homeWorld.county.duchy.kingdom.duchies.filter(d => d.capital.capital.id !== duchyId)[1].capital.capital.id,
                countyId: homeWorld.county.duchy.kingdom.duchies.filter(d => d.capital.capital.id !== duchyId)[1].capital.capital.id,
                playerId,
            });
            game.factions.get(factionId).handleFactionLoop();
            expect(game.factions.get(factionId).factionPlayerRoyalTitles).to.deep.equal({
                counts: [{
                    planetId: countyId,
                    playerId
                }, {
                    planetId: homeWorld.county.duchy.counties.filter(c => c.capital.id !== countyId)[0].capital.id,
                    playerId,
                }, {
                    planetId: homeWorld.county.duchy.counties.filter(c => c.capital.id !== countyId)[1].capital.id,
                    playerId,
                }, {
                    planetId: homeWorld.county.duchy.kingdom.duchies.filter(d => d.capital.capital.id !== duchyId)[0].capital.capital.id,
                    playerId,
                }, {
                    planetId: homeWorld.county.duchy.kingdom.duchies.filter(d => d.capital.capital.id !== duchyId)[1].capital.capital.id,
                    playerId,
                }],
                barons: [],
                dukes: [{
                    planetId: duchyId,
                    playerId,
                }],
                archDukes: [],
                kings: [{
                    planetId: kingdomId,
                    playerId,
                }],
                emperors: []
            });
        });
        it("should be emperor", function () {
            this.timeout(5000);

            const game: Game = new Game();
            game.initializeGame();

            const factionId = EFaction.DUTCH;
            const homeWorldPlanetId = game.factions.get(factionId).homeWorldPlanetId;
            const homeWorld = game.planets.get(homeWorldPlanetId);
            const kingdomId = homeWorld.county.duchy.kingdom.capital.capital.capital.id;
            const duchyId = homeWorld.county.duchy.capital.capital.id;
            const countyId = homeWorld.county.capital.id;
            const playerId = "test";
            homeWorld.county.duchy.kingdom.duchies.forEach(d => d.counties.forEach(p => p.planet.claim(game.factions.get(factionId), true)));
            homeWorld.county.duchy.kingdom.neighborKingdoms[0].duchies[0].counties[0].planet.claim(game.factions.get(factionId), true);
            game.factions.get(factionId).factionPlanetRoster.push({
                factionId,
                kingdomId,
                duchyId,
                countyId,
                playerId,
            }, {
                factionId,
                kingdomId,
                duchyId,
                countyId: homeWorld.county.duchy.counties.filter(c => c.capital.id !== countyId)[0].capital.id,
                playerId,
            }, {
                factionId,
                kingdomId,
                duchyId,
                countyId: homeWorld.county.duchy.counties.filter(c => c.capital.id !== countyId)[1].capital.id,
                playerId,
            }, {
                factionId,
                kingdomId,
                duchyId: homeWorld.county.duchy.kingdom.duchies.filter(d => d.capital.capital.id !== duchyId)[0].capital.capital.id,
                countyId: homeWorld.county.duchy.kingdom.duchies.filter(d => d.capital.capital.id !== duchyId)[0].capital.capital.id,
                playerId,
            }, {
                factionId,
                kingdomId,
                duchyId: homeWorld.county.duchy.kingdom.duchies.filter(d => d.capital.capital.id !== duchyId)[1].capital.capital.id,
                countyId: homeWorld.county.duchy.kingdom.duchies.filter(d => d.capital.capital.id !== duchyId)[1].capital.capital.id,
                playerId,
            }, {
                factionId,
                kingdomId,
                duchyId: homeWorld.county.duchy.kingdom.neighborKingdoms[0].capital.capital.capital.id,
                countyId: homeWorld.county.duchy.kingdom.neighborKingdoms[0].capital.capital.capital.id,
                playerId,
            });
            game.factions.get(factionId).handleFactionLoop();
            expect(game.factions.get(factionId).factionPlayerRoyalTitles).to.deep.equal({
                counts: [{
                    planetId: countyId,
                    playerId
                }, {
                    planetId: homeWorld.county.duchy.counties.filter(c => c.capital.id !== countyId)[0].capital.id,
                    playerId,
                }, {
                    planetId: homeWorld.county.duchy.counties.filter(c => c.capital.id !== countyId)[1].capital.id,
                    playerId,
                }, {
                    planetId: homeWorld.county.duchy.kingdom.duchies.filter(d => d.capital.capital.id !== duchyId)[0].capital.capital.id,
                    playerId,
                }, {
                    planetId: homeWorld.county.duchy.kingdom.duchies.filter(d => d.capital.capital.id !== duchyId)[1].capital.capital.id,
                    playerId,
                }, {
                    planetId: homeWorld.county.duchy.kingdom.neighborKingdoms[0].capital.capital.capital.id,
                    playerId,
                }],
                barons: [],
                dukes: [{
                    planetId: duchyId,
                    playerId,
                }],
                archDukes: [],
                kings: [{
                    planetId: kingdomId,
                    playerId,
                }],
                emperors: [{
                    planetId: game.factions.get(factionId).homeWorldPlanetId,
                    playerId,
                }],
            });
        });
    });
});