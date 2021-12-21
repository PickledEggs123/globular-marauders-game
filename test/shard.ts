import {Game} from "../src";
import {
    EServerType,
    EShardMessageType,
    IAIPlayerDataStateShardMessage,
    ICameraState,
    IGlobalStateShardMessage,
    IPhysicsDataStateShardMessage,
    IShardListItem
} from "../src/Interface";
import {expect} from "chai";

describe("shard tests", () => {
    const setupShards = () => {
        // setup shards
        const shardList: IShardListItem[] = [];
        const shardMap: Map<string, Game> = new Map<string, Game>();

        // load balancer
        const loadBalancerShard = new Game();
        loadBalancerShard.serverType = EServerType.LOAD_BALANCER;
        loadBalancerShard.shardName = "load-balancer";
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
                numPlayers: 0
            });
        }
        // physics shards
        const physicsShards: Game[] = [];
        for (let i = 0; i < loadBalancerShard.voronoiTerrain.kingdoms.length; i++) {
            const physicsShard = new Game();
            physicsShard.serverType = EServerType.PHYSICS_NODE;
            physicsShard.shardName = `physics-kingdom-${i}`;
            physicsShard.physicsKingdomIndex = i;
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
            expect(workerShard.planets.length).to.be.greaterThan(0);
            expect(Object.values(workerShard.factions).length).to.be.greaterThan(0);
        }

        expect(physicsShards.length).to.be.greaterThan(0);
        expect(aiShards.length).to.be.greaterThan(0);

        return {
            shards, workerShards, loadBalancerShard, globalShard, aiShards, physicsShards, shardMap
        };
    }
    describe("10 AI and 20 physics", () => {
        it("should spread AI across AI nodes via load balancer", function () {
            this.timeout(5 * 60 * 1000);

            const { shards, shardMap, loadBalancerShard, aiShards } = setupShards();

            // run shards for 1 minute
            for (let i = 0; i < 60 * 10; i++) {
                for (const shard of shards) {
                    shard.handleServerLoop();
                }
                for (const shard of shards) {
                    for (const [to, message] of shard.outgoingShardMessages) {
                        shardMap.get(to).incomingShardMessages.push([shard.shardName, message]);
                    }
                    shard.outgoingShardMessages.splice(0, shard.outgoingShardMessages.length);
                }
            }

            // expect AI to be spread across load balancer
            const sumAiLoadBalanceCount = loadBalancerShard.aiShardCount.reduce((c, i) => i.numAI + c, 0);
            for (const item of loadBalancerShard.aiShardCount) {
                expect(item.numAI).to.lessThanOrEqual(Math.ceil(sumAiLoadBalanceCount / loadBalancerShard.aiShardCount.length));
            }
            expect(loadBalancerShard.aiShardCount.some(i => i.numAI > 0)).to.be.true;

            // expect AI to be inside each AI shard's memory
            for (const aiShard of aiShards) {
                expect(aiShard.monitoredShips.length).to.lessThanOrEqual(Math.ceil(sumAiLoadBalanceCount / aiShards.length));
            }
            expect(aiShards.some(i => i.monitoredShips.length > 0)).to.be.true;
        });
        it("each AI node should send data", function () {
            this.timeout(5 * 60 * 1000);

            const { shards, shardMap } = setupShards();

            // run shards for 1 minute
            let sentAiMessage: boolean = false;
            for (let i = 0; i < 60 * 10; i++) {
                for (const shard of shards) {
                    shard.handleServerLoop();
                }
                for (const shard of shards) {
                    for (const [to, message] of shard.outgoingShardMessages) {
                        shardMap.get(to).incomingShardMessages.push([shard.shardName, message]);

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
                                expect(message).to.deep.equal(expectedMessage);
                                sentAiMessage = true;
                            }
                        }
                    }
                    shard.outgoingShardMessages.splice(0, shard.outgoingShardMessages.length);
                }
            }
            expect(sentAiMessage).to.be.true;
        });
        it("each Physics node should send data", function () {
            this.timeout(5 * 60 * 1000);

            const { shards, shardMap } = setupShards();

            // run shards for 1 minute
            let sentPhysicsMessage: boolean = false;
            for (let i = 0; i < 60 * 10; i++) {
                for (const shard of shards) {
                    shard.handleServerLoop();
                }
                for (const shard of shards) {
                    for (const [to, message] of shard.outgoingShardMessages) {
                        shardMap.get(to).incomingShardMessages.push([shard.shardName, message]);

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
                                    planets: shard.planets.filter(isInKingdom).map(p => p.serialize())
                                };
                                expect(message).to.deep.equal(expectedMessage);
                                sentPhysicsMessage = true;
                            }
                        }
                    }
                    shard.outgoingShardMessages.splice(0, shard.outgoingShardMessages.length);
                }
            }
            expect(sentPhysicsMessage).to.be.true;
        });
        it("each Global State node should send data", function () {
            this.timeout(5 * 60 * 1000);

            const { shards, shardMap } = setupShards();

            // run shards for 1 minute
            let sentGlobalMessage: boolean = false;
            for (let i = 0; i < 60 * 10; i++) {
                for (const shard of shards) {
                    shard.handleServerLoop();
                }
                for (const shard of shards) {
                    for (const [to, message] of shard.outgoingShardMessages) {
                        shardMap.get(to).incomingShardMessages.push([shard.shardName, message]);

                        if (shard.serverType === EServerType.GLOBAL_STATE_NODE) {
                            if (message.shardMessageType === EShardMessageType.GLOBAL_STATE) {
                                const expectedMessage: IGlobalStateShardMessage = {
                                    shardMessageType: EShardMessageType.GLOBAL_STATE,
                                    factions: Object.values(shard.factions).map(f => f.serialize())
                                };
                                expect(message).to.deep.equal(expectedMessage);
                                sentGlobalMessage = true;
                            }
                        }
                    }
                    shard.outgoingShardMessages.splice(0, shard.outgoingShardMessages.length);
                }
            }
            expect(sentGlobalMessage).to.be.true;
        });
    });
});