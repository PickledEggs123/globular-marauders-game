import {Game, VoronoiKingdom} from "../src";
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
import {EFaction} from "../src/Ship";

describe("shard tests", () => {
    let networkGame: Game | null = null;
    let randomShardOrder: boolean = false;
    const setupShards = (hideAiShips: boolean) => {
        // setup shards
        const shardList: IShardListItem[] = [];
        const shardMap: Map<string, Game> = new Map<string, Game>();

        // load balancer
        const loadBalancerShard = new Game();
        loadBalancerShard.serverType = EServerType.LOAD_BALANCER;
        loadBalancerShard.shardName = "load-balancer";
        loadBalancerShard.spawnAiShips = !hideAiShips;
        loadBalancerShard.initializeGame();
        const gameInitializationFrame = loadBalancerShard.getInitializationFrame();
        shardList.push({
            type: EServerType.LOAD_BALANCER,
            name: loadBalancerShard.shardName
        });
        shardMap.set(loadBalancerShard.shardName, loadBalancerShard);
        // global state
        const globalShard = new Game();
        globalShard.serverType = EServerType.GLOBAL_STATE_NODE;
        globalShard.shardName = "global-state";
        globalShard.spawnAiShips = !hideAiShips;
        shardList.push({
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
            shardList.push({
                type: EServerType.AI_NODE,
                name: aiShard.shardName,
                aiNodeName: aiShard.shardName
            });
            shardMap.set(aiShard.shardName, aiShard);
            loadBalancerShard.aiShardCount.push({
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
            shardList.push({
                type: EServerType.PHYSICS_NODE,
                name: physicsShard.shardName,
                kingdomIndex: i
            });
            shardMap.set(physicsShard.shardName, physicsShard);
        }
        const workerShards: Game[] = [globalShard, ...aiShards, ...physicsShards];
        const shards: Game[] = [loadBalancerShard, ...workerShards];

        // setup load balancer shard
        loadBalancerShard.shardList.splice(0, loadBalancerShard.shardList.length, ...shardList);

        // load game into worker shards
        for (const workerShard of workerShards) {
            workerShard.shardList.splice(0, workerShard.shardList.length, ...shardList);
            workerShard.applyGameInitializationFrame(gameInitializationFrame);
            expect(workerShard.planets.length).to.be.greaterThan(0, "Expected at least one planet in worker shard.");
            expect(Object.values(workerShard.factions).length).to.be.greaterThan(0, "Expected at least one faction in worker shard.");
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
        const playerData = networkGame.playerData[0];
        expect(playerData).not.equal(undefined, "Expected player data to exist");

        // pick faction
        const factionMessage: IChooseFactionMessage = {
            messageType: EMessageType.CHOOSE_FACTION,
            factionId: EFaction.DUTCH
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
        const shipType = networkGame.getSpawnLocations(playerData)[0].shipType;
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
        expect(networkGame.playerData[0].shipId).to.not.equal("");
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
                const sumAiLoadBalanceCount = loadBalancerShard.aiShardCount.reduce((c, i) => i.numAI + c, 0);
                for (const item of loadBalancerShard.aiShardCount) {
                    expect(item.numAI).to.lessThanOrEqual(Math.ceil(sumAiLoadBalanceCount / loadBalancerShard.aiShardCount.length), "Expected an even distribution of NPCs per AI Node.");
                }
                expect(loadBalancerShard.aiShardCount.some(i => i.numAI > 0)).to.be.true;

                // expect AI to be inside each AI shard's memory
                for (const aiShard of aiShards) {
                    expect(aiShard.monitoredShips.length).to.lessThanOrEqual(Math.ceil(sumAiLoadBalanceCount / aiShards.length), "Expected a even distribution of NPCs per AI Node.");
                }
                expect(aiShards.some(i => i.monitoredShips.length > 0)).to.be.true;
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
                                playerData: shard.playerData,
                                ships: shard.ships.filter(s => shard.monitoredShips.includes(s.id)).map(s => ({
                                    shipId: s.id,
                                    shipKeys: s.activeKeys,
                                    orders: s.orders.map(o => o.serialize()),
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
                                ships: shard.ships.filter(isInKingdom).map(s => s.serialize()),
                                cannonBalls: shard.cannonBalls.filter(isInKingdom).map(c => c.serialize()),
                                crates: shard.crates.filter(isInKingdom).map(c => c.serialize()),
                                planets: shard.planets.filter(isInKingdom).map(p => p.serializeFull()),
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
                                factions: Object.values(shard.factions).map(f => f.serialize()),
                                scoreBoard: shard.scoreBoard,
                            };
                            expect(message).to.deep.equal(expectedMessage, "Expected a message with Faction Data");
                            sentGlobalMessage = true;

                            if (shard.ships.length > 0) {
                                hasShipData = true;
                            }
                            if (Object.values(shard.factions).some(f => f.shipIds.length > 0)) {
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
                    playerId: globalShard.playerData[0].id,
                    name: globalShard.playerData[0].name,
                    damage: damageAmount
                };
                globalShard.incomingShardMessages.push(["blah", addDamageMessage]);

                for (let i = 0; i < 10; i++) {
                    runGameLoop(shards, shardMap);
                }
                expect(globalShard.scoreBoard.damage).to.deep.equal([{
                    playerId: globalShard.playerData[0].id,
                    name: globalShard.playerData[0].name,
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
                    playerId: globalShard.playerData[0].id,
                    name: globalShard.playerData[0].name,
                    count: lootAmount
                };
                globalShard.incomingShardMessages.push(["blah", addDamageMessage]);

                for (let i = 0; i < 10; i++) {
                    runGameLoop(shards, shardMap);
                }
                expect(globalShard.scoreBoard.loot).to.deep.equal([{
                    playerId: globalShard.playerData[0].id,
                    name: globalShard.playerData[0].name,
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
                    playerId: globalShard.playerData[0].id,
                    name: globalShard.playerData[0].name,
                    amount: globalShard.playerData[0].moneyAccount.currencies.find(c => c.currencyId === "GOLD").amount * 1000
                }]);
            });
            it("should invest money", function () {
                this.timeout(5 * 60 * 1000);

                // setup test
                const { shards, shardMap, loadBalancerShard } = setupShards(true);
                loginShard(shards, shardMap, loadBalancerShard);
                const globalShard = shards.find(s => s.serverType === EServerType.GLOBAL_STATE_NODE);
                const dutchHomeWorldId = globalShard.factions[EFaction.DUTCH].homeWorldPlanetId;
                const dutchHomeWorld = globalShard.planets.find(p => p.id === dutchHomeWorldId);

                // get initial amount
                for (let i = 0; i < 10; i++) {
                    runGameLoop(shards, shardMap);
                }
                const initialAmount = globalShard.playerData[0].moneyAccount.currencies.find(c => c.currencyId === "GOLD").amount * 1000;
                expect(globalShard.scoreBoard.money).to.deep.equal([{
                    playerId: globalShard.playerData[0].id,
                    name: globalShard.playerData[0].name,
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
                    globalShard.playerData[0].moneyAccount.currencies.find(c => c.currencyId === "GOLD").amount +
                    dutchHomeWorld.investmentAccounts.get("blah2").amount
                    ) * 1000;
                expect(globalShard.scoreBoard.money).to.deep.equal([{
                    playerId: globalShard.playerData[0].id,
                    name: globalShard.playerData[0].name,
                    amount: finalAmount
                }]);
                expect(finalAmount).to.be.greaterThan(initialAmount);

                // withdraw money
                const withdrawalAmount = dutchHomeWorld.investmentAccounts.get("blah2").amount;
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
                    playerId: globalShard.playerData[0].id,
                    name: globalShard.playerData[0].name,
                    amount: finalAmount
                }]);
            });
            it("should rank land", function () {
                this.timeout(5 * 60 * 1000);

                // setup test
                const { shards, shardMap, loadBalancerShard } = setupShards(true);
                loginShard(shards, shardMap, loadBalancerShard);

                const globalShard = shards.find(s => s.serverType === EServerType.GLOBAL_STATE_NODE);
                const dutchHomeWorldId = globalShard.factions[EFaction.DUTCH].homeWorldPlanetId;
                const dutchHomeWorld = globalShard.planets.find(p => p.id === dutchHomeWorldId);

                // claim 4 kingdoms as dutch to create score board
                const kingdomIds: number[] = [
                    globalShard.voronoiTerrain.kingdoms.indexOf(dutchHomeWorld.county.duchy.kingdom),
                    ...globalShard.voronoiTerrain.kingdoms.map((v, i) => i).filter(i => {
                        const existingKingdoms = Object.values(globalShard.factions).map(f => {
                            const planet = globalShard.planets.find(p => p.id === f.homeWorldPlanetId);
                            return globalShard.voronoiTerrain.kingdoms.indexOf(planet.county.duchy.kingdom);
                        });
                        return !existingKingdoms.includes(i);
                    }).slice(0, 3)
                ];
                const physicsNodes: Game[] = kingdomIds.map(kingdomId => shards.find(s => s.serverType === EServerType.PHYSICS_NODE && s.physicsKingdomIndex === kingdomId));
                const kingdoms: VoronoiKingdom[] = physicsNodes.map(n => n.voronoiTerrain.kingdoms[n.physicsKingdomIndex]);
                for (const kingdom of kingdoms) {
                    kingdom.duchies.forEach(d => d.counties.forEach(c => c.planet.claim(kingdom.app.factions[EFaction.DUTCH], true)));
                }
                runGameLoop(shards, shardMap);
                runGameLoop(shards, shardMap);
                runGameLoop(shards, shardMap);

                // create scoreboard
                globalShard.factions[EFaction.DUTCH].factionPlanetRoster.push({
                    factionId: EFaction.DUTCH,
                    playerId: "emperor",
                    kingdomId: kingdoms[0].capital.capital.capital.id,
                    duchyId: kingdoms[0].capital.capital.capital.id,
                    countyId: kingdoms[0].capital.capital.capital.id,
                }, {
                    factionId: EFaction.DUTCH,
                    playerId: "emperor",
                    kingdomId: kingdoms[0].capital.capital.capital.id,
                    duchyId: kingdoms[0].capital.capital.capital.id,
                    countyId: kingdoms[0].capital.capital.duchy.counties.filter(c => c.capital.id !== kingdoms[0].capital.capital.capital.id)[0].capital.id,
                }, {
                    factionId: EFaction.DUTCH,
                    playerId: "emperor",
                    kingdomId: kingdoms[0].capital.capital.capital.id,
                    duchyId: kingdoms[0].capital.capital.capital.id,
                    countyId: kingdoms[0].capital.capital.duchy.counties.filter(c => c.capital.id !== kingdoms[0].capital.capital.capital.id)[1].capital.id,
                }, {
                    factionId: EFaction.DUTCH,
                    playerId: "emperor",
                    kingdomId: kingdoms[0].capital.capital.capital.id,
                    duchyId: kingdoms[0].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[0].capital.capital.capital.id)[0].capital.capital.id,
                    countyId: kingdoms[0].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[0].capital.capital.capital.id)[0].capital.capital.id,
                }, {
                    factionId: EFaction.DUTCH,
                    playerId: "emperor",
                    kingdomId: kingdoms[0].capital.capital.capital.id,
                    duchyId: kingdoms[0].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[0].capital.capital.capital.id)[1].capital.capital.id,
                    countyId: kingdoms[0].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[0].capital.capital.capital.id)[1].capital.capital.id,
                }, {
                    factionId: EFaction.DUTCH,
                    playerId: "emperor",
                    kingdomId: kingdoms[1].capital.capital.capital.id,
                    duchyId: kingdoms[1].capital.capital.capital.id,
                    countyId: kingdoms[1].capital.capital.capital.id,
                });
                globalShard.factions[EFaction.DUTCH].factionPlanetRoster.push({
                    factionId: EFaction.DUTCH,
                    playerId: "king",
                    kingdomId: kingdoms[2].capital.capital.capital.id,
                    duchyId: kingdoms[2].capital.capital.capital.id,
                    countyId: kingdoms[2].capital.capital.capital.id,
                }, {
                    factionId: EFaction.DUTCH,
                    playerId: "king",
                    kingdomId: kingdoms[2].capital.capital.capital.id,
                    duchyId: kingdoms[2].capital.capital.capital.id,
                    countyId: kingdoms[2].capital.capital.duchy.counties.filter(c => c.capital.id !== kingdoms[2].capital.capital.capital.id)[0].capital.id,
                }, {
                    factionId: EFaction.DUTCH,
                    playerId: "king",
                    kingdomId: kingdoms[2].capital.capital.capital.id,
                    duchyId: kingdoms[2].capital.capital.capital.id,
                    countyId: kingdoms[2].capital.capital.duchy.counties.filter(c => c.capital.id !== kingdoms[2].capital.capital.capital.id)[1].capital.id,
                }, {
                    factionId: EFaction.DUTCH,
                    playerId: "king",
                    kingdomId: kingdoms[2].capital.capital.capital.id,
                    duchyId: kingdoms[2].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[2].capital.capital.capital.id)[0].capital.capital.id,
                    countyId: kingdoms[2].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[2].capital.capital.capital.id)[0].capital.capital.id,
                }, {
                    factionId: EFaction.DUTCH,
                    playerId: "king",
                    kingdomId: kingdoms[2].capital.capital.capital.id,
                    duchyId: kingdoms[2].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[2].capital.capital.capital.id)[1].capital.capital.id,
                    countyId: kingdoms[2].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[2].capital.capital.capital.id)[1].capital.capital.id,
                });
                globalShard.factions[EFaction.DUTCH].factionPlanetRoster.push({
                    factionId: EFaction.DUTCH,
                    playerId: "archDuke",
                    kingdomId: kingdoms[1].capital.capital.capital.id,
                    duchyId: kingdoms[1].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[1].capital.capital.capital.id)[0].capital.capital.id,
                    countyId: kingdoms[1].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[1].capital.capital.capital.id)[0].counties[0].capital.id,
                }, {
                    factionId: EFaction.DUTCH,
                    playerId: "archDuke",
                    kingdomId: kingdoms[1].capital.capital.capital.id,
                    duchyId: kingdoms[1].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[1].capital.capital.capital.id)[0].capital.capital.id,
                    countyId: kingdoms[1].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[1].capital.capital.capital.id)[0].counties[1].capital.id,
                }, {
                    factionId: EFaction.DUTCH,
                    playerId: "archDuke",
                    kingdomId: kingdoms[1].capital.capital.capital.id,
                    duchyId: kingdoms[1].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[1].capital.capital.capital.id)[0].capital.capital.id,
                    countyId: kingdoms[1].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[1].capital.capital.capital.id)[0].counties[2].capital.id,
                }, {
                    factionId: EFaction.DUTCH,
                    playerId: "archDuke",
                    kingdomId: kingdoms[1].capital.capital.capital.id,
                    duchyId: kingdoms[1].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[1].capital.capital.capital.id)[1].capital.capital.id,
                    countyId: kingdoms[1].capital.kingdom.duchies.filter(c => c.capital.capital.id !== kingdoms[1].capital.capital.capital.id)[1].capital.capital.id,
                });
                globalShard.factions[EFaction.DUTCH].factionPlanetRoster.push({
                    factionId: EFaction.DUTCH,
                    playerId: "duke",
                    kingdomId: kingdoms[3].capital.capital.capital.id,
                    duchyId: kingdoms[3].duchies[0].counties[0].capital.id,
                    countyId: kingdoms[3].duchies[0].counties[0].capital.id,
                }, {
                    factionId: EFaction.DUTCH,
                    playerId: "duke",
                    kingdomId: kingdoms[3].capital.capital.capital.id,
                    duchyId: kingdoms[3].duchies[0].counties[0].capital.id,
                    countyId: kingdoms[3].duchies[0].counties[1].capital.id,
                }, {
                    factionId: EFaction.DUTCH,
                    playerId: "duke",
                    kingdomId: kingdoms[3].capital.capital.capital.id,
                    duchyId: kingdoms[3].duchies[0].counties[0].capital.id,
                    countyId: kingdoms[3].duchies[0].counties[2].capital.id,
                });
                globalShard.factions[EFaction.DUTCH].factionPlanetRoster.push({
                    factionId: EFaction.DUTCH,
                    playerId: "baron",
                    kingdomId: kingdoms[3].capital.capital.capital.id,
                    duchyId: kingdoms[3].duchies[1].capital.capital.id,
                    countyId: kingdoms[3].duchies[1].counties[0].capital.id,
                }, {
                    factionId: EFaction.DUTCH,
                    playerId: "baron",
                    kingdomId: kingdoms[3].capital.capital.capital.id,
                    duchyId: kingdoms[3].duchies[1].capital.capital.id,
                    countyId: kingdoms[3].duchies[1].counties[1].capital.id,
                });
                globalShard.factions[EFaction.DUTCH].factionPlanetRoster.push({
                    factionId: EFaction.DUTCH,
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
            const dutchHomeWorld = networkGame.planets.find(s => s.id === networkGame.factions[EFaction.DUTCH].homeWorldPlanetId);
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
                lastShipCountFrames.push(networkGame.ships.length);

                if (!setMission) {
                    if (networkGame.playerData[0] && networkGame.playerData[0].shipId) {
                        const ship = networkGame.ships.find(s => s.id === networkGame.playerData[0].shipId);
                        if (ship && neighborKingdomPlanet) {
                            ship.pathFinding.points.unshift(neighborKingdomPlanet.position.rotateVector([0, 0, 1]));
                            setMission = true;
                        }
                    }
                } else if (!nearEnglishWorld) {
                    const ship = networkGame.ships.find(s => s.id === networkGame.playerData[0].shipId);
                    expect(ship).to.not.be.undefined;
                    expect(neighborKingdomPlanet).to.not.be.undefined;
                    if (ship && neighborKingdomPlanet) {
                        const nearestPlanet = networkGame.voronoiTerrain.getNearestPlanet(ship.position.rotateVector([0, 0, 1]));
                        if (nearestPlanet === neighborKingdomPlanet) {
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
    });
});