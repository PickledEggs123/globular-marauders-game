import {Game, Order, VoronoiKingdom} from "../src";
import {
    EServerType,
    EShardMessageType,
    IAIPlayerDataStateShardMessage,
    ICameraState,
    IDamageScoreShardMessage,
    IGlobalStateShardMessage,
    ILootScoreShardMessage,
    IPhysicsDataStateShardMessage,
    IShardListItem,
    IShardMessage
} from "../src/Interface";
import {expect} from "chai";
import {
    EMessageType,
    IChooseFactionMessage,
    IChoosePlanetMessage,
    IInvestDepositMessage,
    IInvestWithdrawalMessage,
    IJoinMessage,
    IJoinResultMessage,
    ISpawnMessage
} from "../src/Game";
import {VoronoiGraph} from "../src/Graph";
import {EOrderType} from "../src/Order";
import {PHYSICS_SCALE} from "../src/ShipType";
import {EFaction} from "../src/EFaction";

describe("shard tests", () => {
    let networkGame: Game | null = null;
    let randomShardOrder: boolean = false;
    const setupShards = (hideAiShips: boolean) => {
        // setup shards
        const shardList: Map<string, IShardListItem> = new Map<string, IShardListItem>();
        const shardMap: Map<string, Game> = new Map<string, Game>();

        // load balancer
        const loadBalancerShard = new Game();
        loadBalancerShard.serverType = EServerType.LOAD_BALANCER;
        loadBalancerShard.shardName = "load-balancer";
        loadBalancerShard.spawnAiShips = !hideAiShips;
        loadBalancerShard.initializeGame();
        const gameInitializationFrame = loadBalancerShard.getInitializationFrame();
        shardList.set(loadBalancerShard.shardName, {
            type: EServerType.LOAD_BALANCER,
            name: loadBalancerShard.shardName
        });
        shardMap.set(loadBalancerShard.shardName, loadBalancerShard);
        // global state
        const globalShard = new Game();
        globalShard.serverType = EServerType.GLOBAL_STATE_NODE;
        globalShard.shardName = "global-state";
        globalShard.spawnAiShips = !hideAiShips;
        shardList.set(globalShard.shardName, {
            type: EServerType.GLOBAL_STATE_NODE,
            name: globalShard.shardName
        });
        shardMap.set(globalShard.shardName, globalShard);
        // ai shards
        const aiShards: Game[] = [];
        for (let i = 0; i < 10; i++) {
            const aiShard = new Game();
            aiShard.serverType = EServerType.AI_NODE;
            aiShard.shardName = `ai-${i}`;
            aiShard.aiNodeName = aiShard.shardName;
            aiShard.spawnAiShips = !hideAiShips;
            aiShards.push(aiShard);
            shardList.set(aiShard.shardName, {
                type: EServerType.AI_NODE,
                name: aiShard.shardName,
                aiNodeName: aiShard.shardName
            });
            shardMap.set(aiShard.shardName, aiShard);
            loadBalancerShard.aiShardCount.set(aiShard.aiNodeName, {
                name: aiShard.aiNodeName,
                numAI: 0,
                players: []
            });
        }
        // physics shards
        const physicsShards: Game[] = [];
        for (let i = 0; i < loadBalancerShard.voronoiTerrain.kingdoms.length; i++) {
            const physicsShard = new Game();
            physicsShard.serverType = EServerType.PHYSICS_NODE;
            physicsShard.shardName = `physics-kingdom-${i}`;
            physicsShard.physicsKingdomIndex = i;
            physicsShard.spawnAiShips = !hideAiShips;
            physicsShards.push(physicsShard);
            shardList.set(physicsShard.shardName, {
                type: EServerType.PHYSICS_NODE,
                name: physicsShard.shardName,
                kingdomIndex: i
            });
            shardMap.set(physicsShard.shardName, physicsShard);
        }
        const workerShards: Game[] = [globalShard, ...aiShards, ...physicsShards];
        const shards: Game[] = [loadBalancerShard, ...workerShards];

        // setup load balancer shard
        loadBalancerShard.shardList = shardList;

        // load game into worker shards
        for (const workerShard of workerShards) {
            workerShard.shardList = shardList;
            workerShard.applyGameInitializationFrame(gameInitializationFrame);
            expect(workerShard.planets.size).to.be.greaterThan(0, "Expected at least one planet in worker shard.");
            expect(Array.from(workerShard.factions.values()).length).to.be.greaterThan(0, "Expected at least one faction in worker shard.");
        }

        expect(physicsShards.length).to.be.greaterThan(0, "Expected at least one physics shard to compute physics.");
        expect(aiShards.length).to.be.greaterThan(0, "Expected at least one AI shard to compute NPC actions");

        return {
            shards, workerShards, loadBalancerShard, globalShard, aiShards, physicsShards, shardMap
        };
    }
    const runGameLoop = (shards: Game[], shardMap: Map<string, Game>, verifyGameLoop?: (shard: Game, to: string, message: IShardMessage) => void) => {
        const shardOrder = randomShardOrder ? [...shards].sort(() => Math.random() > 0.5 ? 1 : -1) : [...shards];
        if (randomShardOrder) {
            // add CPU tick skips for random order to simulate out of order and skipping execution
            for (let i = 0; i < 3; i++) {
                shardOrder.splice(Math.floor(shardOrder.length * Math.random()), 1);
            }
        }
        for (const shard of shardOrder) {
            shard.handleServerLoop();
        }
        for (const shard of shardOrder) {
            for (const [to, message] of shard.outgoingShardMessages) {
                shardMap.get(to).incomingShardMessages.push([shard.shardName, message]);
                if (verifyGameLoop) {
                    verifyGameLoop(shard, to, message);
                }
            }
            for (const [, message] of shard.outgoingMessages) {
                if (message.messageType === EMessageType.JOIN_RESULT) {
                    const joinResultMessage = message as IJoinResultMessage;
                    const shardName = joinResultMessage.shardName;
                    const shard = shardMap.get(shardName);
                    expect(shard).to.not.be.undefined;
                    networkGame = shard;
                    break;
                }
            }
            shard.outgoingMessages.splice(0, shard.outgoingMessages.length);
            shard.outgoingShardMessages.splice(0, shard.outgoingShardMessages.length);
        }
    }
    const loginShard = (shards: Game[], shardMap: Map<string, Game>, loadBalancerShard: Game) => {
        // pick name
        const loginMessage: IJoinMessage = {
            messageType: EMessageType.JOIN,
            name: "test"
        };
        loadBalancerShard.incomingMessages.push(["blah1", loginMessage]);
        runGameLoop(shards, shardMap);
        runGameLoop(shards, shardMap);
        runGameLoop(shards, shardMap);
        loadBalancerShard.outgoingMessages.splice(0, loadBalancerShard.outgoingMessages.length);
        networkGame.incomingMessages.push(["blah2", loginMessage]);
        runGameLoop(shards, shardMap);
        runGameLoop(shards, shardMap);
        runGameLoop(shards, shardMap);
        const playerData = Array.from(networkGame.playerData.values())[0];
        expect(playerData).not.equal(undefined, "Expected player data to exist");

        // pick faction
        const factionMessage: IChooseFactionMessage = {
            messageType: EMessageType.CHOOSE_FACTION,
            factionId: EFaction.DWARVEN
        };
        networkGame.incomingMessages.push(["blah2", factionMessage]);
        runGameLoop(shards, shardMap);
        runGameLoop(shards, shardMap);
        runGameLoop(shards, shardMap);

        // pick planet
        const planetId = networkGame.getSpawnPlanets(playerData)[0].planetId;
        const planetMessage: IChoosePlanetMessage = {
            messageType: EMessageType.CHOOSE_PLANET,
            planetId
        };
        networkGame.incomingMessages.push(["blah2", planetMessage]);
        runGameLoop(shards, shardMap);
        runGameLoop(shards, shardMap);
        runGameLoop(shards, shardMap);

        // pick ship
        const shipType = networkGame.getSpawnLocations(playerData).results[0].shipType;
        const spawn: ISpawnMessage = {
            messageType: EMessageType.SPAWN,
            planetId,
            shipType
        };
        networkGame.incomingMessages.push(["blah2", spawn]);
        runGameLoop(shards, shardMap);
        runGameLoop(shards, shardMap);
        runGameLoop(shards, shardMap);
        runGameLoop(shards, shardMap);
        runGameLoop(shards, shardMap);
        runGameLoop(shards, shardMap);
        runGameLoop(shards, shardMap);
        runGameLoop(shards, shardMap);
        runGameLoop(shards, shardMap);
        runGameLoop(shards, shardMap);
        runGameLoop(shards, shardMap);
        runGameLoop(shards, shardMap);
        expect(Array.from(networkGame.playerData.values())[0].shipId).to.not.equal("");
    };
    beforeEach(() => {
        networkGame = null;
    });
    describe("10 AI and 20 physics", () => {
        describe("node should send data", () => {
            it("should spread AI across AI nodes via load balancer", function () {
                this.timeout(5 * 60 * 1000);

                const { shards, shardMap, loadBalancerShard, aiShards } = setupShards(false);

                // run shards for 1 minute
                for (let i = 0; i < 10; i++) {
                    runGameLoop(shards, shardMap);
                }

                // expect AI to be spread across load balancer
                const sumAiLoadBalanceCount = Array.from(loadBalancerShard.aiShardCount.values()).reduce((c, i) => i.numAI + c, 0);
                for (const [, item] of loadBalancerShard.aiShardCount) {
                    expect(item.numAI).to.lessThanOrEqual(Math.ceil(sumAiLoadBalanceCount / loadBalancerShard.aiShardCount.size), "Expected an even distribution of NPCs per AI Node.");
                }
                expect(Array.from(loadBalancerShard.aiShardCount.values()).some(i => i.numAI > 0)).to.be.true;

                // expect AI to be inside each AI shard's memory
                for (const aiShard of aiShards) {
                    expect(aiShard.monitoredShips.size).to.lessThanOrEqual(Math.ceil(sumAiLoadBalanceCount / aiShards.length), "Expected a even distribution of NPCs per AI Node.");
                }
                expect(aiShards.some(i => i.monitoredShips.size > 0)).to.be.true;
            });
            it("each AI node should send data", function () {
                this.timeout(5 * 60 * 1000);

                const { shards, shardMap } = setupShards(false);

                // run shards for 1 minute
                let sentAiMessage: boolean = false;
                let hasShipData: boolean = false;
                const verifyGameLoop = (shard: Game, to: string, message: IShardMessage) => {
                    if (shard.serverType === EServerType.AI_NODE) {
                        if (message.shardMessageType === EShardMessageType.AI_PLAYER_DATA_STATE) {
                            const expectedMessage: IAIPlayerDataStateShardMessage = {
                                shardMessageType: EShardMessageType.AI_PLAYER_DATA_STATE,
                                playerData: Array.from(shard.playerData.values()),
                                ships: Array.from(shard.ships.values()).filter(s => shard.monitoredShips.has(s.id)).map(s => ({
                                    shipId: s.id,
                                    shipKeys: s.activeKeys,
                                    orders: s.orders.map(o => o.serialize()),
                                    characters: s.characters.map(o => o.serialize()),
                                    pathFinding: s.pathFinding.serialize(),
                                    fireControl: s.fireControl.serialize()
                                }))
                            };
                            expect(message).to.deep.equal(expectedMessage, "Expected a message containing all NPC Data.");
                            sentAiMessage = true;

                            if (expectedMessage.ships.length > 0) {
                                hasShipData = true;
                            }
                        }
                    }
                };
                for (let i = 0; i < 10; i++) {
                    runGameLoop(shards, shardMap, verifyGameLoop);
                }
                expect(sentAiMessage).to.be.true;
                expect(hasShipData).to.be.true;
            });
            it("each Physics node should send data", function () {
                this.timeout(5 * 60 * 1000);

                const { shards, shardMap } = setupShards(false);

                // run shards for 1 minute
                let sentPhysicsMessage: boolean = false;
                let hasShipData: boolean = false;
                const verifyGameLoop = (shard: Game, to: string, message: IShardMessage) => {
                    if (shard.serverType === EServerType.PHYSICS_NODE) {
                        const isInKingdom = (c: ICameraState): boolean => {
                            const planet = shard.voronoiTerrain.getNearestPlanet(c.position.rotateVector([0, 0, 1]));
                            return shard.voronoiTerrain.kingdoms.indexOf(planet.county.duchy.kingdom) === shard.physicsKingdomIndex;
                        };
                        if (message.shardMessageType === EShardMessageType.PHYSICS_DATA_STATE) {
                            const expectedMessage: IPhysicsDataStateShardMessage = {
                                shardMessageType: EShardMessageType.PHYSICS_DATA_STATE,
                                ships: Array.from(shard.ships.values()).filter(isInKingdom).map(s => s.serialize()),
                                cannonBalls: Array.from(shard.cannonBalls.values()).filter(isInKingdom).map(c => c.serialize()),
                                crates: Array.from(shard.crates.values()).filter(isInKingdom).map(c => c.serialize()),
                                planets: Array.from(shard.planets.values()).filter(isInKingdom).map(p => p.serializeFull()),
                                transferIds: [],
                            };
                            expect(message).to.deep.equal(expectedMessage, "Expected a message containing all Physics Data.");
                            sentPhysicsMessage = true;

                            if (expectedMessage.ships.length > 0) {
                                hasShipData = true;
                            }
                        }
                    }
                };
                for (let i = 0; i < 10; i++) {
                    runGameLoop(shards, shardMap, verifyGameLoop);
                }
                expect(sentPhysicsMessage).to.be.true;
                expect(hasShipData).to.be.true;
            });
            it("each Global State node should send data", function () {
                this.timeout(5 * 60 * 1000);

                const { shards, shardMap } = setupShards(false);

                // run shards for 1 minute
                let sentGlobalMessage: boolean = false;
                let hasShipData: boolean = false;
                let hasFactionShipData: boolean = false;
                const verifyGameLoop = (shard: Game, to: string, message: IShardMessage) => {
                    if (shard.serverType === EServerType.GLOBAL_STATE_NODE) {
                        if (message.shardMessageType === EShardMessageType.GLOBAL_STATE) {
                            const expectedMessage: IGlobalStateShardMessage = {
                                shardMessageType: EShardMessageType.GLOBAL_STATE,
                                factions: Array.from(shard.factions.values()).map(f => f.serialize()),
                                scoreBoard: shard.scoreBoard,
                            };
                            expect(message).to.deep.equal(expectedMessage, "Expected a message with Faction Data");
                            sentGlobalMessage = true;

                            if (shard.ships.size > 0) {
                                hasShipData = true;
                            }
                            if (Array.from(shard.factions.values()).some(f => f.shipIds.length > 0)) {
                                hasFactionShipData = true;
                            }
                        }
                    }
                };
                for (let i = 0; i < 10; i++) {
                    runGameLoop(shards, shardMap, verifyGameLoop);
                }
                expect(sentGlobalMessage).to.be.true;
                expect(hasShipData).to.be.true;
                expect(hasFactionShipData).to.be.true;
            });
        });
        describe("score board", () => {
            it("should add damage", function () {
                this.timeout(5 * 60 * 1000);

                const { shards, shardMap, loadBalancerShard } = setupShards(true);
                loginShard(shards, shardMap, loadBalancerShard);

                const globalShard = shards.find(s => s.serverType === EServerType.GLOBAL_STATE_NODE);
                const damageAmount = 1000;
                const addDamageMessage: IDamageScoreShardMessage = {
                    shardMessageType: EShardMessageType.DAMAGE_SCORE,
                    playerId: Array.from(globalShard.playerData.values())[0].id,
                    name: Array.from(globalShard.playerData.values())[0].name,
                    damage: damageAmount
                };
                globalShard.incomingShardMessages.push(["blah", addDamageMessage]);

                for (let i = 0; i < 10; i++) {
                    runGameLoop(shards, shardMap);
                }
                expect(globalShard.scoreBoard.damage).to.deep.equal([{
                    playerId: Array.from(globalShard.playerData.values())[0].id,
                    name: Array.from(globalShard.playerData.values())[0].name,
                    damage: damageAmount
                }]);
            });
            it("should add loot", function () {
                this.timeout(5 * 60 * 1000);

                const { shards, shardMap, loadBalancerShard } = setupShards(true);
                loginShard(shards, shardMap, loadBalancerShard);

                const globalShard = shards.find(s => s.serverType === EServerType.GLOBAL_STATE_NODE);
                const lootAmount = 10;
                const addDamageMessage: ILootScoreShardMessage = {
                    shardMessageType: EShardMessageType.LOOT_SCORE,
                    playerId: Array.from(globalShard.playerData.values())[0].id,
                    name: Array.from(globalShard.playerData.values())[0].name,
                    count: lootAmount
                };
                globalShard.incomingShardMessages.push(["blah", addDamageMessage]);

                for (let i = 0; i < 10; i++) {
                    runGameLoop(shards, shardMap);
                }
                expect(globalShard.scoreBoard.loot).to.deep.equal([{
                    playerId: Array.from(globalShard.playerData.values())[0].id,
                    name: Array.from(globalShard.playerData.values())[0].name,
                    count: lootAmount
                }]);
            });
            it("should add money", function () {
                this.timeout(5 * 60 * 1000);

                const { shards, shardMap, loadBalancerShard } = setupShards(true);
                loginShard(shards, shardMap, loadBalancerShard);

                const globalShard = shards.find(s => s.serverType === EServerType.GLOBAL_STATE_NODE);

                for (let i = 0; i < 10; i++) {
                    runGameLoop(shards, shardMap);
                }
                expect(globalShard.scoreBoard.money).to.deep.equal([{
                    playerId: Array.from(globalShard.playerData.values())[0].id,
                    name: Array.from(globalShard.playerData.values())[0].name,
                    amount: Array.from(globalShard.playerData.values())[0].moneyAccount.currencies.find(c => c.currencyId === "GOLD").amount * 1000
                }]);
            });
            it("should invest money", function () {
                this.timeout(5 * 60 * 1000);

                // setup test
                const { shards, shardMap, loadBalancerShard } = setupShards(true);
                loginShard(shards, shardMap, loadBalancerShard);
                const globalShard = shards.find(s => s.serverType === EServerType.GLOBAL_STATE_NODE);
                const dutchHomeWorldId = globalShard.factions.get(EFaction.DWARVEN).homeWorldPlanetId;
                const dutchHomeWorld = globalShard.planets.get(dutchHomeWorldId);

                // get initial amount
                for (let i = 0; i < 10; i++) {
                    runGameLoop(shards, shardMap);
                }
                const initialAmount = Array.from(globalShard.playerData.values())[0].moneyAccount.currencies.find(c => c.currencyId === "GOLD").amount * 1000;
                expect(globalShard.scoreBoard.money).to.deep.equal([{
                    playerId: Array.from(globalShard.playerData.values())[0].id,
                    name: Array.from(globalShard.playerData.values())[0].name,
                    amount: initialAmount
                }]);

                // deposit 1000 into investments
                const depositAmount = 1000;
                const depositMessage: IInvestDepositMessage = {
                    messageType: EMessageType.INVEST_DEPOSIT,
                    planetId: dutchHomeWorldId,
                    amount: depositAmount
                };
                networkGame.incomingMessages.push(["blah2", depositMessage]);

                // run for 10 minutes
                for (let i = 0; i < 10 * 60 * 10; i++) {
                    runGameLoop(shards, shardMap);
                }

                // check final amount after 10 minutes
                const finalAmount = (
                    Array.from(globalShard.playerData.values())[0].moneyAccount.currencies.find(c => c.currencyId === "GOLD").amount +
                    dutchHomeWorld.investmentAccounts.get("blah2")!.lots.reduce((acc, lot) => acc + (lot.ticksRemaining === 0 ? lot.matureAmount : lot.amount), 0)
                    );
                expect(globalShard.scoreBoard.money).to.deep.equal([{
                    playerId: Array.from(globalShard.playerData.values())[0].id,
                    name: Array.from(globalShard.playerData.values())[0].name,
                    amount: finalAmount
                }]);
                expect(finalAmount).to.be.greaterThan(initialAmount);

                // withdraw money
                const withdrawalAmount = dutchHomeWorld.investmentAccounts.get("blah2")!.lots.reduce((acc, lot) => acc + (lot.ticksRemaining === 0 ? lot.matureAmount : 0), 0);
                const withdrawalMessage: IInvestWithdrawalMessage = {
                    messageType: EMessageType.INVEST_WITHDRAWAL,
                    planetId: dutchHomeWorldId,
                    amount: withdrawalAmount
                };
                networkGame.incomingMessages.push(["blah2", withdrawalMessage]);

                // run for 1 minute
                for (let i = 0; i < 10 * 60 * 10; i++) {
                    runGameLoop(shards, shardMap);
                }

                // the final amount is the same
                expect(globalShard.scoreBoard.money).to.deep.equal([{
                    playerId: Array.from(globalShard.playerData.values())[0].id,
                    name: Array.from(globalShard.playerData.values())[0].name,
                    amount: finalAmount
                }]);
            });
            it("should rank land", function () {
                this.timeout(5 * 60 * 1000);

                // setup test
                const { shards, shardMap, loadBalancerShard } = setupShards(true);
                loginShard(shards, shardMap, loadBalancerShard);

                const globalShard = shards.find(s => s.serverType === EServerType.GLOBAL_STATE_NODE);
                const dutchHomeWorldId = globalShard.factions.get(EFaction.DWARVEN).homeWorldPlanetId;
                const dutchHomeWorld = globalShard.planets.get(dutchHomeWorldId);

                // claim 4 kingdoms as Dutch to create score board
                const kingdomIds: number[] = [
                    globalShard.voronoiTerrain.kingdoms.indexOf(dutchHomeWorld.county.duchy.kingdom),
                    ...globalShard.voronoiTerrain.kingdoms.map((v, i) => i).filter(i => {
                        const existingKingdoms = Array.from(globalShard.factions.values()).map(f => {
                            const planet = globalShard.planets.get(f.homeWorldPlanetId);
                            return globalShard.voronoiTerrain.kingdoms.indexOf(planet.county.duchy.kingdom);
                        });
                        return !existingKingdoms.includes(i);
                    }).slice(0, 3)
                ];
                const physicsNodes: Game[] = kingdomIds.map(kingdomId => shards.find(s => s.serverType === EServerType.PHYSICS_NODE && s.physicsKingdomIndex === kingdomId));
                const kingdoms: VoronoiKingdom[] = physicsNodes.map(n => n.voronoiTerrain.kingdoms[n.physicsKingdomIndex]);
                for (const kingdom of kingdoms) {
                    kingdom.duchies.forEach(d => d.counties.forEach(c => c.planet.claim(kingdom.app.factions.get(EFaction.DWARVEN), true, null)));
                }
                runGameLoop(shards, shardMap);
                runGameLoop(shards, shardMap);
                runGameLoop(shards, shardMap);

                // create scoreboard
                globalShard.factions.get(EFaction.DWARVEN).factionPlanetRoster.push({
                    factionId: EFaction.DWARVEN,
                    playerId: "emperor",
                    kingdomId: kingdoms[0].capital.capital.capital.id,
                    duchyId: kingdoms[0].capital.capital.capital.id,
                    countyId: kingdoms[0].capital.capital.capital.id,
                }, {
                    factionId: EFaction.DWARVEN,
                    playerId: "emperor",
                    kingdomId: kingdoms[0].capital.capital.capital.id,
                    duchyId: kingdoms[0].capital.capital.capital.id,
                    countyId: kingdoms[0].capital.capital.duchy.counties.filter(c => c.capital.id !== kingdoms[0].capital.capital.capital.id)[0].capital.id,
                }, {
                    factionId: EFaction.DWARVEN,
                    playerId: "emperor",
                    kingdomId: kingdoms[0].capital.capital.capital.id,
                    duchyId: kingdoms[0].capital.capital.capital.id,
                    countyId: kingdoms[0].capital.capital.duchy.counties.filter(c => c.capital.id !== kingdoms[0].capital.capital.capital.id)[1].capital.id,
                }, {
                    factionId: EFaction.DWARVEN,
                    playerId: "emperor",
                    kingdomId: kingdoms[0].capital.capital.capital.id,
                    duchyId: kingdoms[0].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[0].capital.capital.capital.id)[0].capital.capital.id,
                    countyId: kingdoms[0].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[0].capital.capital.capital.id)[0].capital.capital.id,
                }, {
                    factionId: EFaction.DWARVEN,
                    playerId: "emperor",
                    kingdomId: kingdoms[0].capital.capital.capital.id,
                    duchyId: kingdoms[0].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[0].capital.capital.capital.id)[1].capital.capital.id,
                    countyId: kingdoms[0].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[0].capital.capital.capital.id)[1].capital.capital.id,
                }, {
                    factionId: EFaction.DWARVEN,
                    playerId: "emperor",
                    kingdomId: kingdoms[1].capital.capital.capital.id,
                    duchyId: kingdoms[1].capital.capital.capital.id,
                    countyId: kingdoms[1].capital.capital.capital.id,
                });
                globalShard.factions.get(EFaction.DWARVEN).factionPlanetRoster.push({
                    factionId: EFaction.DWARVEN,
                    playerId: "king",
                    kingdomId: kingdoms[2].capital.capital.capital.id,
                    duchyId: kingdoms[2].capital.capital.capital.id,
                    countyId: kingdoms[2].capital.capital.capital.id,
                }, {
                    factionId: EFaction.DWARVEN,
                    playerId: "king",
                    kingdomId: kingdoms[2].capital.capital.capital.id,
                    duchyId: kingdoms[2].capital.capital.capital.id,
                    countyId: kingdoms[2].capital.capital.duchy.counties.filter(c => c.capital.id !== kingdoms[2].capital.capital.capital.id)[0].capital.id,
                }, {
                    factionId: EFaction.DWARVEN,
                    playerId: "king",
                    kingdomId: kingdoms[2].capital.capital.capital.id,
                    duchyId: kingdoms[2].capital.capital.capital.id,
                    countyId: kingdoms[2].capital.capital.duchy.counties.filter(c => c.capital.id !== kingdoms[2].capital.capital.capital.id)[1].capital.id,
                }, {
                    factionId: EFaction.DWARVEN,
                    playerId: "king",
                    kingdomId: kingdoms[2].capital.capital.capital.id,
                    duchyId: kingdoms[2].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[2].capital.capital.capital.id)[0].capital.capital.id,
                    countyId: kingdoms[2].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[2].capital.capital.capital.id)[0].capital.capital.id,
                }, {
                    factionId: EFaction.DWARVEN,
                    playerId: "king",
                    kingdomId: kingdoms[2].capital.capital.capital.id,
                    duchyId: kingdoms[2].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[2].capital.capital.capital.id)[1].capital.capital.id,
                    countyId: kingdoms[2].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[2].capital.capital.capital.id)[1].capital.capital.id,
                });
                globalShard.factions.get(EFaction.DWARVEN).factionPlanetRoster.push({
                    factionId: EFaction.DWARVEN,
                    playerId: "archDuke",
                    kingdomId: kingdoms[1].capital.capital.capital.id,
                    duchyId: kingdoms[1].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[1].capital.capital.capital.id)[0].capital.capital.id,
                    countyId: kingdoms[1].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[1].capital.capital.capital.id)[0].counties[0].capital.id,
                }, {
                    factionId: EFaction.DWARVEN,
                    playerId: "archDuke",
                    kingdomId: kingdoms[1].capital.capital.capital.id,
                    duchyId: kingdoms[1].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[1].capital.capital.capital.id)[0].capital.capital.id,
                    countyId: kingdoms[1].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[1].capital.capital.capital.id)[0].counties[1].capital.id,
                }, {
                    factionId: EFaction.DWARVEN,
                    playerId: "archDuke",
                    kingdomId: kingdoms[1].capital.capital.capital.id,
                    duchyId: kingdoms[1].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[1].capital.capital.capital.id)[0].capital.capital.id,
                    countyId: kingdoms[1].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[1].capital.capital.capital.id)[0].counties[2].capital.id,
                }, {
                    factionId: EFaction.DWARVEN,
                    playerId: "archDuke",
                    kingdomId: kingdoms[1].capital.capital.capital.id,
                    duchyId: kingdoms[1].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[1].capital.capital.capital.id)[1].capital.capital.id,
                    countyId: kingdoms[1].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[1].capital.capital.capital.id)[1].capital.capital.id,
                });
                globalShard.factions.get(EFaction.DWARVEN).factionPlanetRoster.push({
                    factionId: EFaction.DWARVEN,
                    playerId: "duke",
                    kingdomId: kingdoms[3].capital.capital.capital.id,
                    duchyId: kingdoms[3].duchies[0].counties[0].capital.id,
                    countyId: kingdoms[3].duchies[0].counties[0].capital.id,
                }, {
                    factionId: EFaction.DWARVEN,
                    playerId: "duke",
                    kingdomId: kingdoms[3].capital.capital.capital.id,
                    duchyId: kingdoms[3].duchies[0].counties[0].capital.id,
                    countyId: kingdoms[3].duchies[0].counties[1].capital.id,
                }, {
                    factionId: EFaction.DWARVEN,
                    playerId: "duke",
                    kingdomId: kingdoms[3].capital.capital.capital.id,
                    duchyId: kingdoms[3].duchies[0].counties[0].capital.id,
                    countyId: kingdoms[3].duchies[0].counties[2].capital.id,
                });
                globalShard.factions.get(EFaction.DWARVEN).factionPlanetRoster.push({
                    factionId: EFaction.DWARVEN,
                    playerId: "baron",
                    kingdomId: kingdoms[3].capital.capital.capital.id,
                    duchyId: kingdoms[3].duchies[1].capital.capital.id,
                    countyId: kingdoms[3].duchies[1].counties[0].capital.id,
                }, {
                    factionId: EFaction.DWARVEN,
                    playerId: "baron",
                    kingdomId: kingdoms[3].capital.capital.capital.id,
                    duchyId: kingdoms[3].duchies[1].capital.capital.id,
                    countyId: kingdoms[3].duchies[1].counties[1].capital.id,
                });
                globalShard.factions.get(EFaction.DWARVEN).factionPlanetRoster.push({
                    factionId: EFaction.DWARVEN,
                    playerId: "count",
                    kingdomId: kingdoms[3].capital.capital.capital.id,
                    duchyId: kingdoms[3].duchies[1].capital.capital.id,
                    countyId: kingdoms[3].duchies[1].counties[2].capital.id,
                });

                // run loop to compute score
                runGameLoop(shards, shardMap);

                // check score board
                expect(globalShard.scoreBoard.land).to.deep.equal([{
                    playerId: "emperor",
                    name: "emperor",
                    amount: 20,
                }, {
                    playerId: "king",
                    name: "king",
                    amount: 13,
                }, {
                    playerId: "archDuke",
                    name: "archDuke",
                    amount: 11,
                }, {
                    playerId: "duke",
                    name: "duke",
                    amount: 6,
                }, {
                    playerId: "baron",
                    name: "baron",
                    amount: 4,
                }, {
                    playerId: "count",
                    name: "count",
                    amount: 1,
                }]);
            })
        });
        const testPhysicsNodeTravel = function () {
            this.timeout(5 * 60 * 1000);

            const { shards, shardMap, loadBalancerShard } = setupShards(true);
            loginShard(shards, shardMap, loadBalancerShard);

            // run shards for 1 minute
            let setMission: boolean = false;
            let nearEnglishWorld: boolean = false;
            const dutchHomeWorld = networkGame.planets.get(networkGame.factions.get(EFaction.DWARVEN).homeWorldPlanetId);
            const dutchKingdom = dutchHomeWorld.county.duchy.kingdom;
            const neighborKingdom = dutchKingdom.neighborKingdoms[0];
            const neighborKingdomPlanet = neighborKingdom.duchies[0].counties[0].planet;
            let shipCount: Map<string, number> = new Map<string, number>();
            const verifyGameLoop = (shard: Game, to: string, message: IShardMessage) => {
                if (message.shardMessageType === EShardMessageType.PHYSICS_DATA_STATE && to === networkGame.shardName) {
                    const {ships} = message as IPhysicsDataStateShardMessage;
                    for (const ship of ships) {
                        if (shipCount.has(ship.id)) {
                            shipCount.set(ship.id, shipCount.get(ship.id) + 1);
                        } else {
                            shipCount.set(ship.id, 1);
                        }
                    }
                }
            };
            const lastShipCountFrames: number[] = [];
            const numShipCountFrames = 100;
            for (let i = 0; i < 3 * 60 * 10; i++) {
                if (lastShipCountFrames.length > numShipCountFrames - 1) {
                    lastShipCountFrames.splice(numShipCountFrames - 1, lastShipCountFrames.length - numShipCountFrames - 1);
                }
                lastShipCountFrames.push(networkGame.ships.size);

                if (!setMission) {
                    if (Array.from(networkGame.playerData.values())[0] && Array.from(networkGame.playerData.values())[0].shipId) {
                        const ship = networkGame.ships.get(Array.from(networkGame.playerData.values())[0].shipId);
                        if (ship && neighborKingdomPlanet) {
                            ship.orders[0].stage = 3;
                            ship.pathFinding.points.splice(0, ship.pathFinding.points.length);
                            const newOrder = new Order(networkGame, ship, ship.faction);
                            newOrder.orderType = EOrderType.FEUDAL_TRADE;
                            newOrder.planetId = neighborKingdomPlanet.id;
                            ship.orders.push(newOrder);
                            setMission = true;
                        }
                    }
                } else if (!nearEnglishWorld) {
                    const ship = networkGame.ships.get(Array.from(networkGame.playerData.values())[0].shipId);
                    expect(ship).to.not.be.undefined;
                    expect(neighborKingdomPlanet).to.not.be.undefined;
                    if (ship && neighborKingdomPlanet) {
                        const distance = VoronoiGraph.angularDistance(
                            neighborKingdomPlanet.position.rotateVector([0, 0, 1]),
                            ship.position.rotateVector([0, 0, 1]),
                            networkGame.worldScale
                        );
                        if (distance < 200 * PHYSICS_SCALE) {
                            nearEnglishWorld = true;
                        }
                    }
                } else {
                    break;
                }
                runGameLoop(shards, shardMap, verifyGameLoop);
                expect(shipCount.size).to.lessThanOrEqual(1);
                shipCount = new Map<string, number>();
            }
            expect(setMission).to.be.true;
            expect(nearEnglishWorld).to.be.true;
            expect(lastShipCountFrames).to.not.contain(0);
        };
        const testMoveFromOriginalSpot = function () {
            this.timeout(5 * 60 * 1000);

            const { shards, shardMap, aiShards } = setupShards(false);
            networkGame = aiShards[0];

            // run shards for 1 minute
            const shipPositionMap: Map<string, [number, number, number]> = new Map<string, [number, number, number]>();
            const shipHasOrderMap: Map<string, boolean> = new Map<string, boolean>();
            const shipHasPointsMap: Map<string, boolean> = new Map<string, boolean>();
            const shipMovedMap: Map<string, boolean> = new Map<string, boolean>();
            let allShipsMoved: boolean = false;
            for (let i = 0; i < 3 * 60 * 10; i++) {
                if (i === 20) {
                    for (const [, ship] of networkGame.ships) {
                        shipPositionMap.set(ship.id, ship.position.rotateVector([0, 0, 1]));
                        shipHasPointsMap.set(ship.id, false);
                    }
                } else if (shipPositionMap.size > 0) {
                    for (const [shipId, position] of shipPositionMap.entries()) {
                        const ship = networkGame.ships.get(shipId);
                        if (ship) {
                            const shipMoved = VoronoiGraph.angularDistance(
                                position,
                                ship.position.rotateVector([0, 0, 1]),
                                networkGame.worldScale
                            ) > 100 * PHYSICS_SCALE;
                            shipMovedMap.set(shipId, shipMoved);

                            if (ship.pathFinding.points.length > 0) {
                                shipHasPointsMap.set(shipId, true);
                            }

                            if (ship.orders.length > 0 && ship.orders[0].orderType !== EOrderType.ROAM) {
                                shipHasOrderMap.set(shipId, true);
                            }
                        } else {
                            shipMovedMap.set(shipId, true);
                            shipHasPointsMap.set(shipId, true);
                            shipHasOrderMap.set(shipId, true);
                        }
                    }
                    if ([...shipMovedMap.values()].every(s => s)) {
                        allShipsMoved = true;
                        break;
                    }
                }
                runGameLoop(shards, shardMap);
            }
            expect([...shipHasPointsMap.values()].every(s => s)).to.be.true;
            expect([...shipHasOrderMap.values()].every(s => s)).to.be.true;
            expect(allShipsMoved).to.be.true;
        };
        describe("traveling between physics shards (normal order)", () => {
            for (let trial = 0; trial < 1000; trial++) {
                it(`try ${trial + 1}`, testPhysicsNodeTravel);
            }
        });
        describe("traveling between physics shards (random order)", () => {
            beforeEach(() => {
                randomShardOrder = true;
            });
            afterEach(() => {
                randomShardOrder = false;
            });
            for (let trial = 0; trial < 1000; trial++) {
                it(`try ${trial + 1}`, testPhysicsNodeTravel);
            }
        });
        describe("move from original spot (normal order)", () => {
            for (let trial = 0; trial < 10; trial++) {
                it(`try ${trial + 1}`, testMoveFromOriginalSpot);
            }
        });
        describe("move from original spot (random order)", () => {
            beforeEach(() => {
                randomShardOrder = true;
            });
            afterEach(() => {
                randomShardOrder = false;
            });
            for (let trial = 0; trial < 10; trial++) {
                it(`try ${trial + 1}`, testMoveFromOriginalSpot);
            }
        });
    });
});