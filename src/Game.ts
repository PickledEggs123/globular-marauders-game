/**
 * The direction of the market trade node/edge.
 */
import {ISerializedPlanet, ISerializedPlanetFull, Planet} from "./Planet";
import {
    EFormEmitterType,
    EServerType,
    EShardMessageType,
    IAIPlayerDataStateShardMessage,
    IAiShardCountItem,
    ICameraState,
    IClaimPlanetShardMessage,
    ICollidable,
    ICreateShipFactionShardMessage,
    IDamageScoreShardMessage,
    IDeathShardMessage,
    IDestroyShipFactionShardMessage,
    IDestroyShipPlanetShardMessage,
    IDirectedMarketTrade,
    IExpirableTicks,
    IFetchOrderResultShardMessage,
    IFetchOrderShardMessage,
    IFormCard,
    IFormEmitter,
    IFormRequest,
    IFormResult,
    IGlobalStateShardMessage,
    IInvestDepositShardMessage,
    IInvestWithdrawShardMessage,
    IJoinAliasShardMessage,
    ILootScoreShardMessage,
    IPhysicsDataStateShardMessage,
    IScoreBoard,
    IScoreBoardLandItem,
    IScoreBoardMoneyItem,
    IShardListItem,
    IShardMessage,
    IShipStateShardMessage,
    ISpawnAiResultShardMessage,
    ISpawnAiShardMessage,
    ISpawnResultShardMessage,
    ISpawnShardMessage,
    ITradeShipPlanetShardMessage,
    ITributeShipPlanetShardMessage
} from "./Interface";
import {FireControl, ISerializedFireControl, ISerializedShip, Ship} from "./Ship";
import {ISerializedVoronoiTerrain, VoronoiCounty, VoronoiKingdom, VoronoiTerrain, VoronoiTree} from "./VoronoiTree";
import {Faction, ISerializedFaction, LuxuryBuff} from "./Faction";
import {
    CannonBall,
    Crate,
    DeserializeQuaternion,
    ISerializedCannonBall,
    ISerializedCrate,
    ISerializedQuaternion,
    SerializeQuaternion,
} from "./Item";
import Quaternion from "quaternion";
import {
    DelaunayGraph,
    DelaunayTile,
    DelaunayTriangle,
    ICellData,
    IDrawableTile,
    ISerializedPathFinder,
    ITessellatedTriangle,
    PathFinder,
    PathingNode,
    VoronoiCell,
    VoronoiGraph
} from "./Graph";
import {IHitTest} from "./Intersection";
import {EOrderType, ISerializedOrder, Order} from "./Order";
import {Star} from "./Star";
import {Market} from "./Market";
import {EShipType, GetShipData, PHYSICS_SCALE} from "./ShipType";
import {EFaction} from "./EFaction";
import {Invasion, ISerializedInvasion} from "./Invasion";
import {MoneyAccount} from "./MoneyAccount";

/**
 * A list of player specific data for the server to store.
 */
export interface IPlayerData {
    id: string;
    name: string;
    factionId: EFaction | null;
    planetId: string | null;
    shipId: string;
    activeKeys: string[];
    filterActiveKeys?: string[];
    moneyAccount: MoneyAccount;
    autoPilotEnabled: boolean;
    aiNodeName: string | undefined;
}

export interface ISpawnFaction {
    factionId: string;
    numShips: number;
    numPlanets: number;
    numInvasions: number;
}

/**
 * A list of possible spawn planets.
 */
export interface ISpawnPlanet {
    planetId: string;
    numShipsAvailable: number;
    numSettlers: number;
    numTraders: number;
    numPirates: number;
    numInvaders: number;
}

/**
 * A list of possible spawn locations.
 */
export interface ISpawnLocation {
    id: string;
    numShipsAvailable: number;
    price: number;
    shipType: EShipType;
}

export interface ISpawnLocationResult {
    results: ISpawnLocation[];
    message: string | undefined;
}

/**
 * The type of message sent to and from the server.
 */
export enum EMessageType {
    JOIN = "JOIN",
    JOIN_RESULT = "JOIN_RESULT",
    CHOOSE_FACTION = "CHOOSE_FACTION",
    CHOOSE_PLANET = "CHOOSE_PLANET",
    CLAIM_PLANET = "CLAIM_PLANET",
    SPAWN = "SPAWN",
    DEATH = "DEATH",
    INVEST_DEPOSIT = "INVEST_DEPOSIT",
    INVEST_WITHDRAWAL = "INVEST_WITHDRAWAL",
    AUTOPILOT = "AUTOPILOT",
    SHIP_STATE = "SHIP_STATE",
}

export interface IMessage {
    messageType: EMessageType;
}

export interface IJoinMessage extends IMessage {
    messageType: EMessageType.JOIN;
    name: string;
}

export interface IJoinResultMessage extends IMessage {
    messageType: EMessageType.JOIN_RESULT;
    shardName: string;
}

export interface IChooseFactionMessage extends IMessage {
    messageType: EMessageType.CHOOSE_FACTION;
    factionId: EFaction | null;
}

export interface IChoosePlanetMessage extends IMessage {
    messageType: EMessageType.CHOOSE_PLANET;
    planetId: string | null;
}

export interface IClaimPlanetMessage extends IMessage {
    messageType: EMessageType.CLAIM_PLANET;
    planetId: string;
    factionId: string;
}

export interface ISpawnMessage extends IMessage {
    messageType: EMessageType.SPAWN;
    shipType: EShipType;
    planetId: string;
}

export interface IDeathMessage extends IMessage {
    messageType: EMessageType.DEATH;
}

export interface IInvestDepositMessage extends IMessage {
    messageType: EMessageType.INVEST_DEPOSIT;
    amount: number;
    planetId: string;
}

export interface IInvestWithdrawalMessage extends IMessage {
    messageType: EMessageType.INVEST_WITHDRAWAL;
    amount: number;
    planetId: string;
}

export interface IAutoPilotMessage extends IMessage {
    messageType: EMessageType.AUTOPILOT;
    enabled: boolean;
}

export interface IShipStateMessage extends IMessage {
    messageType: EMessageType.SHIP_STATE;
    position: ISerializedQuaternion;
    positionVelocity: ISerializedQuaternion;
    orientation: ISerializedQuaternion;
    orientationVelocity: ISerializedQuaternion;
    newCannonBalls: ISerializedCannonBall[];
}

/**
 * The initial game data sent from server to client. Used to set up terrain.
 */
export interface IGameInitializationFrame {
    worldScale: number;
    factions: ISerializedFaction[];
    voronoiTerrain: ISerializedVoronoiTerrain;
    ships: ISerializedShip[];
    cannonBalls: ISerializedCannonBall[];
    crates: ISerializedCrate[];
}

/**
 * An interface to perform delta updates on the networked objects.
 */
export interface IGameSyncFrameDelta<T extends {id: string}> {
    create: T[];
    update: T[];
    remove: string[];
}

/**
 * Data sent from server to client on every frame. 10 times a second. Should create an animation effect.
 */
export interface IGameSyncFrame {
    ships: IGameSyncFrameDelta<ISerializedShip>;
    cannonBalls: IGameSyncFrameDelta<ISerializedCannonBall>;
    crates: IGameSyncFrameDelta<ISerializedCrate>;
    planets: IGameSyncFrameDelta<ISerializedPlanet>;
    factions: IGameSyncFrameDelta<ISerializedFaction>;
    scoreBoard: IGameSyncFrameDelta<IScoreBoard & {id: string}>;
    invasions: ISerializedInvasion[];
    soundEvents: ISoundEvent[];
}

/**
 * The state of a player's game. Used for computing the delta or difference between the server and the player.
 */
export interface IPlayerSyncState {
    id: string;
    ships: ISerializedShip[];
    cannonBalls: ISerializedCannonBall[];
    crates: ISerializedCrate[];
    planets: ISerializedPlanet[];
    factions: ISerializedFaction[];
    scoreBoard: (IScoreBoard & {id: string})[];
    soundEvents: ISoundEvent[];
}

export enum ESoundType {
    FIRE = "FIRE",
    HIT = "HIT",
    ACCELERATE = "ACCELERATE",
    DECELERATE = "DECELERATE",
    MONEY = "MONEY",
    LAND = "LAND",
    LOOT = "LOOT",
}

export enum ESoundEventType {
    ONE_OFF = "ONE_OFF",
    CONTINUOUS = "CONTINUOUS",
}

export interface ISoundEvent {
    shipId: string;
    soundType: ESoundType;
    soundEventType: ESoundEventType;
}

export class Game {
    public voronoiShips: VoronoiTree<Ship> = new VoronoiTree(this);
    public voronoiTerrain: VoronoiTerrain = new VoronoiTerrain(this);
    public factions: Map<string, Faction> = new Map<string, Faction>();
    public ships: Map<string, Ship> = new Map<string, Ship>();
    public crates: Map<string, Crate> = new Map<string, Crate>();
    public planets: Map<string, Planet> = new Map<string, Planet>();
    public directedMarketTrade: Record<string, Array<IDirectedMarketTrade>> = {};
    public cannonBalls: Map<string, CannonBall> = new Map<string, CannonBall>();
    public luxuryBuffs: LuxuryBuff[] = [];
    public worldScale: number = 3;
    public shipScale: number = 4;
    public demoAttackingShipId: string | null = null;
    public lastDemoAttackingShipTime: Date = new Date();
    public tradeTick: number = 10 * 5;
    public playerData: Map<string, IPlayerData> = new Map<string, IPlayerData>();
    public playerSyncState: Map<string, IPlayerSyncState> = new Map<string, IPlayerSyncState>();
    public incomingMessages: Array<[string, IMessage]> = [];
    public outgoingMessages: Array<[string, IMessage]> = [];
    public isTestMode: boolean = false;
    public spawnAiShips: boolean = true;
    public numInitialRandomAiShips: number = 0;
    public initialRandomAiShipPoint: [number, number, number] | undefined;
    public disabledShipsCanRotate: boolean = false;
    public serverType: EServerType = EServerType.STANDALONE;
    public physicsKingdomIndex: number | undefined = undefined;
    public aiNodeName: string | undefined = undefined;
    public fetchingOrder: Set<string> = new Set<string>();
    public spawningPlanets: Set<string> = new Set<string>();
    public updatingIds: Map<string, number> = new Map<string, number>();
    public monitoredShips: Set<string> = new Set<string>();
    public shardList: Map<string, IShardListItem> = new Map<string, IShardListItem>();
    public shardName?: string;
    public aiShardCount: Map<string, IAiShardCountItem> = new Map<string, IAiShardCountItem>();
    public playerIdAliases: Map<string, string> = new Map<string, string>();
    public outgoingShardMessages: Array<[string, IShardMessage]> = [];
    public incomingShardMessages: Array<[string, IShardMessage]> = [];
    public scoreBoard: IScoreBoard = {
        damage: [],
        loot: [],
        money: [],
        land: [],
        bounty: [],
        capture: []
    };
    public invasions: Map<string, Invasion> = new Map<string, Invasion>();
    public soundEvents: Array<ISoundEvent> = [];
    public scriptEvents: Array<IterableIterator<void>> = [];
    public formEmitters: Map<string, IFormEmitter[]> = new Map<string, IFormEmitter[]>();

    /**
     * Velocity step size of ships.
     */
    public static VELOCITY_STEP: number = 1 / 6000;
    /**
     * The speed of the cannonball projectiles.
     */
    public static PROJECTILE_SPEED: number = Game.VELOCITY_STEP * 200;
    /**
     * How long a cannonball will live for in ticks.
     */
    public static PROJECTILE_LIFE: number = 30;
    /**
     * The enemy detection range.
     */
    public static PROJECTILE_DETECTION_RANGE: number = Game.PROJECTILE_SPEED * Game.PROJECTILE_LIFE * 1.2;
    /**
     * The number of burn ticks.
     */
    public static NUM_BURN_TICKS: number = 10;
    /**
     * The number of repair ticks.
     */
    public static NUM_REPAIR_TICKS: number = 10;
    /**
     * The number of ticks between each health tick event.
     */
    public static HEALTH_TICK_COOL_DOWN: number = 3 * 10;
    /**
     * The amount of damage that is burn damage.
     */
    public static BURN_DAMAGE_RATIO: number = 0.5;
    /**
     * The amount of damage that is repairable damage.
     */
    public static REPAIR_DAMAGE_RATIO: number = 0.8;
    /**
     * Rotation step size of ships.
     */
    public static ROTATION_STEP: number = 1 / 300;
    /**
     * The drag which slows down increases of velocity.
     */
    public static VELOCITY_DRAG: number = 1 / 20;
    /**
     * The rotation which slows down increases of rotation.
     */
    public static ROTATION_DRAG: number = 1 / 10;
    /**
     * The power of the brake action. Slow down velocity dramatically.
     */
    public static BRAKE_POWER: number = 1 / 10;
    /**
     * THe number of seconds between each trade tick.
     */
    public static TRADE_TICK_COOL_DOWN: number = 10 * 60 * 10;

    public addFormEmitter(playerId: string, formEmitter: IFormEmitter): void {
        if (!this.formEmitters.has(playerId)) {
            this.formEmitters.set(playerId, []);
        }
        if (!this.formEmitters.get(playerId)!.some(x => x.type === formEmitter.type && x.id === formEmitter.id)) {
            this.formEmitters.get(playerId)!.push(formEmitter);
        }
    }

    public removeFormEmitter(playerId: string, formEmitter: IFormEmitter): void {
        if (!this.formEmitters.has(playerId)) {
            this.formEmitters.set(playerId, []);
        }
        const index = this.formEmitters.get(playerId)!.findIndex(x => x.type === formEmitter.type && x.id === formEmitter.id);
        if (index >= 0) {
            this.formEmitters.get(playerId)!.splice(index, 1);
        }
    }

    /**
     * Get the initial game load for multiplayer purposes.
     */
    public getInitializationFrame(): IGameInitializationFrame {
        return {
            worldScale: this.worldScale,
            factions: Array.from(this.factions.values()).map(f => f.serialize()),
            voronoiTerrain: this.voronoiTerrain.serialize(),
            ships: Array.from(this.ships.values()).map(s => s.serialize()),
            cannonBalls: Array.from(this.cannonBalls.values()).map(c => c.serialize()),
            crates: Array.from(this.crates.values()).map(c => c.serialize())
        };
    }

    hashCode(str: string) {
        let hash = 0, i, chr;
        if (str.length === 0) return hash;
        for (i = 0; i < str.length; i++) {
            chr   = str.charCodeAt(i);
            hash  = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    };
    private listToMap<T extends {id:string, serialize?() }>(list: T[]): Map<string, T> {
        const map = new Map<string, T>();
        list.forEach(item => map.set(item.id, item));
        return map;
    }
    private computeSyncDelta<T extends {id: string, serialize?() }>(oldData: Map<string, T>, newData: T[], canUpdate: boolean): IGameSyncFrameDelta<T> {
        const oldHashes: Map<string, [number, T]> = new Map<string, [number, T]>();
        Array.from(oldData.values()).forEach((i) => oldHashes.set(i.id, [this.hashCode(JSON.stringify(i.serialize ? i.serialize() : i)), i]));
        const newHashes: Map<string, [number, T]> = new Map<string, [number, T]>();
        Array.from(newData.values()).forEach((i) => newHashes.set(i.id, [this.hashCode(JSON.stringify(i.serialize ? i.serialize() : i, )), i]));

        const create: T[] = [];
        const update: T[] = [];
        const remove: string[] = [];

        for (const [newItemKey, [newItemHash, newItem]] of newHashes) {
            const otherItem = oldHashes.get(newItemKey);
            if (otherItem) {
                const [oldItemHash, oldItem] = otherItem;
                if (canUpdate && newItemHash !== oldItemHash) {
                    update.push(newItem);
                }
            } else {
                create.push(newItem);
            }
        }
        for (const [oldItemKey] of oldHashes) {
            const otherItem = newHashes.get(oldItemKey);
            if (!otherItem) {
                remove.push(oldItemKey);
            }
        }

        return {
            create,
            update,
            remove
        };
    };

    private computeSyncFrame(oldState: IPlayerSyncState, newState: IPlayerSyncState): IGameSyncFrame {
        const item: IGameSyncFrame = {
            ships: this.computeSyncDelta(this.listToMap(oldState.ships), newState.ships, true),
            crates: this.computeSyncDelta(this.listToMap(oldState.crates), newState.crates, false),
            cannonBalls: this.computeSyncDelta(this.listToMap(oldState.cannonBalls), newState.cannonBalls, false),
            planets: this.computeSyncDelta(this.listToMap(oldState.planets), newState.planets, true),
            factions: this.computeSyncDelta(this.listToMap(oldState.factions), newState.factions, true),
            scoreBoard: this.computeSyncDelta(this.listToMap(oldState.scoreBoard), newState.scoreBoard, true),
            invasions: Array.from(this.invasions.values()).map(i => i.serialize()),
            soundEvents: newState.soundEvents,
        };

        this.playerSyncState.delete(oldState.id);
        this.playerSyncState.set(newState.id, newState);

        return item;
    }

    /**
     * Get a single frame of the game 10 times a second. For multiplayer purposes.
     */
    public getSyncFrame(playerData: IPlayerData, newPlayerState: IPlayerSyncState): IGameSyncFrame {
        let playerDelta: IPlayerSyncState = this.playerSyncState.get(playerData.id);
        if (!playerDelta) {
            playerDelta = {
                id: playerData.id,
                factions: [],
                planets: [],
                ships: [],
                crates: [],
                cannonBalls: [],
                scoreBoard: [],
                soundEvents: [],
            };
        }

        return this.computeSyncFrame(playerDelta, newPlayerState);
    }

    /**
     * Sync an array of network objects.
     * @param mainArray The main array which should mutate.
     * @param dataArray The data array to apply to the main array.
     * @param createFunc A function to create a new instance.
     * @param updateFunc A function to update an old instance.
     */
    public static syncNetworkArray<T extends {id: string}, U extends {id: string}>(mainArray: Map<string, T>, dataArray: IGameSyncFrameDelta<U>, createFunc: ((u: U) => T) | null, updateFunc: (t: T, u: U) => void) {
        for (const shipData of dataArray.create) {
            // ship does not exist, create a new one
            if (createFunc) {
                mainArray.set(shipData.id, createFunc(shipData));
            }
        }
        for (const shipData of dataArray.update) {
            const ship = mainArray.get(shipData.id);
            if (ship) {
                // ship did exist and still exist, simply update
                updateFunc(ship, shipData)
            } else if (createFunc) {
                mainArray.set(shipData.id, createFunc(shipData));
            }
        }
        // remove old ships
        for (const ship of dataArray.remove) {
            mainArray.delete(ship);
        }
    }

    /**
     * Sync an array of network objects.
     * @param mainArray The main array which should mutate.
     * @param dataArray The data array to apply to the main array.
     * @param createFunc A function to create a new instance.
     * @param updateFunc A function to update an old instance.
     */
    public static syncNetworkMap<T extends {id: string}, U extends {id: string}>(mainArray: Map<string, T>, dataArray: IGameSyncFrameDelta<U>, createFunc: ((u: U) => T) | null, updateFunc: (t: T, u: U) => void) {
        for (const shipData of dataArray.create) {
            // ship does not exist, create a new one
            if (createFunc) {
                mainArray.set(shipData.id, createFunc(shipData));
            }
        }
        for (const shipData of dataArray.update) {
            const ship = mainArray.get(shipData.id);
            if (ship) {
                // ship did exist and still exist, simply update
                updateFunc(ship, shipData)
            } else if (createFunc) {
                mainArray.set(shipData.id, createFunc(shipData));
            }
        }
        // remove old ships
        for (const shipId of dataArray.remove) {
            mainArray.delete(shipId);
        }
    }

    /**
     * Apply an initial load frame to the game. For multiplayer purposes.
     * @param data
     */
    public applyGameInitializationFrame(data: IGameInitializationFrame) {
        this.worldScale = data.worldScale;

        for (const factionData of data.factions) {
            if (this.factions.has(factionData.id)) {
                this.factions.get(factionData.id).deserializeUpdate(factionData);
            } else {
                this.factions.set(factionData.id, Faction.deserialize(this, factionData));
            }
        }

        this.voronoiTerrain = VoronoiTerrain.deserialize(this, data.voronoiTerrain);
        this.planets = new Map<string, Planet>();
        Array.from(this.voronoiTerrain.getPlanets()).forEach(p => {
            this.planets.set(p.id, p);
            if (p.county.faction) {
                p.claim(p.county.faction, false, null);
            }
        });

        Game.syncNetworkArray(
            this.ships, {
                create: data.ships,
                update: [],
                remove: []
            },
            (v: ISerializedShip) => Ship.deserialize(this, v),
            (s: Ship, v: ISerializedShip) => s.deserializeUpdate(v)
        );
        Game.syncNetworkArray(
            this.cannonBalls, {
                create: data.cannonBalls,
                update: [],
                remove: []
            },
            (v: ISerializedCannonBall) => CannonBall.deserialize(v),
            (s: CannonBall, v: ISerializedCannonBall) => s.deserializeUpdate(v)
        );
        Game.syncNetworkArray(
            this.crates, {
                create: data.crates,
                update: [],
                remove: []
            },
            (v: ISerializedCrate) => Crate.deserialize(v),
            (s: Crate, v: ISerializedCrate) => s.deserializeUpdate(v)
        );
    }

    /**
     * Apply a game frame 10 times a second to the game. For multiplayer purposes.
     * @param data
     */
    public applyGameSyncFrame(data: IGameSyncFrame) {
        Game.syncNetworkArray(
            this.ships,
            data.ships,
            (v: ISerializedShip) => Ship.deserialize(this, v),
            (s: Ship, v: ISerializedShip) => s.deserializeUpdate(v)
        );
        Game.syncNetworkArray(
            this.cannonBalls,
            data.cannonBalls,
            (v: ISerializedCannonBall) => CannonBall.deserialize(v),
            (s: CannonBall, v: ISerializedCannonBall) => s.deserializeUpdate(v)
        );
        Game.syncNetworkArray(
            this.crates,
            data.crates,
            (v: ISerializedCrate) => Crate.deserialize(v),
            (s: Crate, v: ISerializedCrate) => s.deserializeUpdate(v)
        );
        Game.syncNetworkArray(
            this.planets,
            data.planets,
            null,
            (s: Planet, v: ISerializedPlanet) => s.deserializeUpdate(v)
        );
        Game.syncNetworkMap(
            this.factions,
            data.factions,
            (v: ISerializedFaction) => Faction.deserialize(this, v),
            (s: Faction, v: ISerializedFaction) => s.deserializeUpdate(v)
        );
        const scoreBoardData = data.scoreBoard.create[0] ?? data.scoreBoard.update[0];
        if (scoreBoardData) {
            this.scoreBoard = scoreBoardData;
        }
        this.invasions.clear();
        const invasionData = data.invasions.map(d => Invasion.deserialize(this, d));
        for (const invasion of invasionData) {
            this.invasions.set(invasion.planetId, invasion);
        }
        this.soundEvents = data.soundEvents;
    }

    public getSpawnFactions(): ISpawnFaction[] {
        return Array.from(this.factions.values()).map((f): ISpawnFaction => ({
            factionId: f.id,
            numPlanets: f.planetIds.length,
            numShips: f.shipIds.length,
            numInvasions: Array.from(this.invasions.values()).reduce((acc, i) => acc + (i.attacking === f ? 1 : 0), 0)
        }));
    }

    public getSpawnPlanets(playerData: IPlayerData): ISpawnPlanet[] {
        const spawnPlanets: ISpawnPlanet[] = [];

        // get faction
        let faction: Faction | null = null;
        if (playerData.factionId) {
            faction = this.factions.get(playerData.factionId) ?? null;
        }

        if (faction) {
            // get planets of faction
            const planetsToSpawnAt = Array.from(this.planets.values()).filter(p => faction && faction.planetIds.includes(p.id) && p.allowedToSpawn())
                .sort((a, b) => {
                    const settlementLevelDifference = b.settlementLevel - a.settlementLevel;
                    if (settlementLevelDifference !== 0) {
                        return settlementLevelDifference;
                    }
                    const settlementProgressDifference = b.settlementProgress - a.settlementProgress;
                    if (settlementProgressDifference !== 0) {
                        return settlementProgressDifference;
                    }
                    if (a.id > b.id) {
                        return -1;
                    } else {
                        return 1;
                    }
                });

            // get ships at planets of faction
            for (const planet of planetsToSpawnAt) {
                const spawnPlanet: ISpawnPlanet = {
                    planetId: planet.id,
                    numShipsAvailable: planet.shipyard.numShipsAvailable,
                    numSettlers: Object.values(planet.explorationGraph).reduce((acc, p) => acc + p.settlerShipIds.length, 0),
                    numTraders: Object.values(planet.explorationGraph).reduce((acc, p) => acc + p.traderShipIds.length, 0),
                    numPirates: Object.values(planet.explorationGraph).reduce((acc, p) => acc + p.pirateShipIds.length, 0),
                    numInvaders: Object.values(planet.explorationGraph).reduce((acc, p) => acc + p.invaderShipIds.length, 0),
                };
                spawnPlanets.push(spawnPlanet);
            }
        }

        return spawnPlanets;
    }
    public getSpawnLocations(playerData: IPlayerData): ISpawnLocationResult {
        const spawnLocations: ISpawnLocation[] = [];

        // get faction
        let faction: Faction | null = null;
        if (playerData.factionId) {
            faction = this.factions.get(playerData.factionId) ?? null;
        }

        if (faction) {
            // get planets of faction
            const planetsToSpawnAt = Array.from(this.planets.values()).filter(p => faction && faction.planetIds.includes(p.id))
                .sort((a, b) => {
                    const settlementLevelDifference = b.settlementLevel - a.settlementLevel;
                    if (settlementLevelDifference !== 0) {
                        return settlementLevelDifference;
                    }
                    const settlementProgressDifference = b.settlementProgress - a.settlementProgress;
                    if (settlementProgressDifference !== 0) {
                        return settlementProgressDifference;
                    }
                    if (a.id > b.id) {
                        return -1;
                    } else {
                        return 1;
                    }
                });

            // get ships at planets of faction
            for (const planet of planetsToSpawnAt) {
                if (planet.id !== playerData.planetId) {
                    continue;
                }

                for (const shipType of Object.values(EShipType)) {
                    const numShipsAvailable = planet.getNumShipsAvailable(shipType);
                    if (numShipsAvailable > 0 && planet.allowedToSpawn() && (playerData.moneyAccount.hasEnough(planet.shipyard.quoteShip(shipType)) || shipType === EShipType.CUTTER)) {
                        const spawnLocation: ISpawnLocation = {
                            id: planet.id,
                            numShipsAvailable,
                            price: planet.shipyard.quoteShip(shipType)[0].amount,
                            shipType
                        };
                        spawnLocations.push(spawnLocation);
                    }
                }
            }
        }

        return {
            results: spawnLocations,
            message: this.planets.get(playerData.planetId)?.allowedToSpawn() ? undefined : "Not allowed to spawn due to conflict"
        };
    }

    static GetCameraState(viewableObject: ICameraState): ICameraState {
        return {
            id: viewableObject.id,
            color: viewableObject.color,
            position: viewableObject.position.clone(),
            positionVelocity: viewableObject.positionVelocity.clone(),
            orientation: viewableObject.orientation.clone(),
            orientationVelocity: viewableObject.orientationVelocity.clone(),
            cannonLoading: viewableObject.cannonLoading,
            size: viewableObject.size,
        };
    }

    public initializeGame(maxShips: number = 200) {
        // initialize 3d terrain stuff
        this.voronoiTerrain.generateTerrain();

        // initialize planets
        this.planets = new Map<string, Planet>();
        Array.from(this.voronoiTerrain.getPlanets()).forEach(p => this.planets.set(p.id, p));

        // initialize factions
        const factionStartingPoints = this.generateGoodPoints(5, 10).map(p => p.centroid);
        let factionStartingKingdoms = this.voronoiTerrain.kingdoms;
        const getStartingKingdom = (point: [number, number, number]): VoronoiKingdom => {
            // get the closest kingdom to the point
            const kingdom = factionStartingKingdoms.reduce((acc, k) => {
                if (!acc) {
                    return k;
                } else {
                    const distanceToAcc = VoronoiGraph.angularDistance(point, acc.voronoiCell.centroid, this.worldScale);
                    const distanceToK = VoronoiGraph.angularDistance(point, k.voronoiCell.centroid, this.worldScale);
                    if (distanceToK < distanceToAcc) {
                        return k;
                    } else {
                        return acc;
                    }
                }
            }, null as VoronoiKingdom | null);

            // handle empty value
            if (!kingdom) {
                throw new Error("Could not find a kingdom to start a faction on");
            }

            // return closest kingdom
            factionStartingKingdoms = factionStartingKingdoms.filter(k => k !== kingdom);
            return kingdom;
        };
        const factionDataList = [{
            id: EFaction.DUTCH,
            color: "orange",
            // the forth planet is always in a random location
            // the Dutch are a republic which means players can vote on things
            // but the Dutch are weaker compared to the kingdoms
            kingdom: getStartingKingdom(factionStartingPoints[0])
        }, {
            id: EFaction.ENGLISH,
            color: "red",
            kingdom: getStartingKingdom(factionStartingPoints[1])
        }, {
            id: EFaction.FRENCH,
            color: "blue",
            kingdom: getStartingKingdom(factionStartingPoints[2])
        }, {
            id: EFaction.PORTUGUESE,
            color: "green",
            kingdom: getStartingKingdom(factionStartingPoints[3])
        }, {
            id: EFaction.SPANISH,
            color: "yellow",
            kingdom: getStartingKingdom(factionStartingPoints[4])
        }];
        for (const factionData of factionDataList) {
            let planetId: string | null = null;
            if (factionData.kingdom) {
                for (const duchy of factionData.kingdom.duchies) {
                    for (const county of duchy.counties) {
                        if (county.planet) {
                            planetId = county.planet.id;
                            break;
                        }
                    }
                    if (planetId) {
                        break;
                    }
                }
            }
            if (!planetId) {
                throw new Error("Could not find planet to make faction");
            }
            const faction = new Faction(this, factionData.id, factionData.color, planetId);
            faction.maxShips = maxShips;
            this.factions.set(factionData.id, faction);
            const planet = this.planets.get(planetId);
            if (planet) {
                planet.setAsStartingCapital();
                planet.claim(faction, false, null);
            }
            if (planet && !this.isTestMode) {
                for (let numShipsToStartWith = 0; numShipsToStartWith < 10; numShipsToStartWith++) {
                    const shipType = planet.shipyard.getNextShipTypeToBuild();
                    const shipData = GetShipData(shipType, this.shipScale);
                    if (!shipData) {
                        throw new Error("Could not find ship type");
                    }
                    planet.wood += shipData.cost;
                    planet.cannons += shipData.cannons.numCannons;
                    planet.cannonades += shipData.cannons.numCannonades;
                    planet.shipyard.buildShip(shipType);
                    const dock = planet.shipyard.docks[planet.shipyard.docks.length - 1];
                    if (dock) {
                        dock.progress = dock.shipCost - 1;
                    }
                }
            }
        }

        // initialize random test ships
        const initialShipFaction = Array.from(this.factions.values())[0];
        const initialShipHomeWorld = this.planets.get(initialShipFaction.homeWorldPlanetId);
        for (let i = 0; i < this.numInitialRandomAiShips; i++) {
            const ship = new Ship(this, EShipType.CUTTER);
            ship.faction = initialShipFaction;
            ship.planet = initialShipHomeWorld;
            ship.id = `ship-${initialShipHomeWorld.id}-${initialShipFaction.getShipAutoIncrement()}`;
            Game.addRandomPositionAndOrientationToEntity(ship);
            ship.color = initialShipFaction.factionColor;
            if (this.initialRandomAiShipPoint) {
                ship.pathFinding.points.push(this.initialRandomAiShipPoint);
            }
            this.ships.set(ship.id, ship);
            initialShipFaction.shipIds.push(ship.id);
            initialShipFaction.shipsAvailable[ship.shipType] += 1;
        }
    }

    /**
     * Get the currently selected player ship. This is a placeholder method within the server class. It should return
     * identity. The client will render this result centered on the player's ship while the server will render an
     * identity ship.
     */
    public getPlayerShip(): ICameraState {
        // no faction selected, orbit the world
        const tempShip = new Ship(this, EShipType.CUTTER);
        tempShip.id = "ghost-ship";
        return Game.GetCameraState(tempShip);
    }


    /**
     * Compute a set of physics quaternions for the hull.
     * @param hullPoints A physics hull to convert to quaternions.
     * @param worldScale The size of the world.
     * @private
     */
    public static getPhysicsHull(hullPoints: Array<[number, number]>, worldScale: number): Quaternion[] {
        const hullSpherePoints = hullPoints.map(([xi, yi]): [number, number, number] => {
            const x = xi * PHYSICS_SCALE / worldScale;
            const y = -yi * PHYSICS_SCALE / worldScale;
            const z = Math.sqrt(1 - Math.pow(x, 2) - Math.pow(y, 2));
            return [x, y, z];
        });
        return hullSpherePoints.map((point) => Quaternion.fromBetweenVectors([0, 0, 1], point));
    }

    public static getAveragePoint(points: Array<[number, number, number]>): [number, number, number] {
        let sum: [number, number, number] = [0, 0, 0];
        for (const point of points) {
            sum = DelaunayGraph.add(sum, point);
        }
        return [
            sum[0] / points.length,
            sum[1] / points.length,
            sum[2] / points.length,
        ];
    }

    /**
     * Process a ship by making changes to the ship's data.
     * @param shipId id to get ship's state.
     * @param getActiveKeys Get the ship's active keys.
     * @param isAutomated If the function is called by AI, which shouldn't clear pathfinding logic.
     * @private
     */
    public handleShipLoop(shipId: string, getActiveKeys: () => string[], isAutomated: boolean) {
        let {
            id: cameraId,
            position: cameraPosition,
            positionVelocity: cameraPositionVelocity,
            orientation: cameraOrientation,
            orientationVelocity: cameraOrientationVelocity,
            cannonLoading: cameraCannonLoading,
            cannonCoolDown,
            shipType,
            faction
        } = this.ships.get(shipId);
        const shipData = GetShipData(shipType, this.shipScale);
        if (!shipData) {
            throw new Error("Could not find Ship Type");
        }
        const speedFactor = this.ships.get(shipId).getSpeedFactor();
        const velocityAcceleration = this.ships.get(shipId).getVelocityAcceleration();
        const velocitySpeed = this.ships.get(shipId).getVelocitySpeed();
        const rotationSpeed = this.ships.get(shipId).getRotation();
        const disabledMovement = this.ships.get(shipId).hasDisabledMovement();
        const newCannonBalls: CannonBall[] = [];

        let clearPathFindingPoints: boolean = false;

        const activeKeys = getActiveKeys();

        // handle movement
        if (!(disabledMovement && !this.disabledShipsCanRotate) && activeKeys.includes("a")) {
            const rotation = Quaternion.fromAxisAngle([0, 0, 1], Math.PI).pow(rotationSpeed);
            const rotationDrag = cameraOrientationVelocity.pow(Game.ROTATION_DRAG).inverse();
            cameraOrientationVelocity = cameraOrientationVelocity.clone().mul(rotation).mul(rotationDrag);
            if (VoronoiGraph.angularDistanceQuaternion(cameraOrientationVelocity, 1) < Math.PI * rotationSpeed * 0.9) {
                cameraOrientationVelocity = Quaternion.ONE;
            }
        }
        if (!(disabledMovement && !this.disabledShipsCanRotate) && activeKeys.includes("d")) {
            const rotation = Quaternion.fromAxisAngle([0, 0, 1], -Math.PI).pow(rotationSpeed);
            const rotationDrag = cameraOrientationVelocity.pow(Game.ROTATION_DRAG).inverse();
            cameraOrientationVelocity = cameraOrientationVelocity.clone().mul(rotation).mul(rotationDrag);
            if (VoronoiGraph.angularDistanceQuaternion(cameraOrientationVelocity, 1) < Math.PI * rotationSpeed * 0.9) {
                cameraOrientationVelocity = Quaternion.ONE;
            }
        }
        if (!disabledMovement && activeKeys.includes("w")) {
            const forward = cameraOrientation.clone().rotateVector([0, 1, 0]);
            const rotation = Quaternion.fromBetweenVectors([0, 0, 1], forward).pow(velocityAcceleration / this.worldScale);
            const rotationDrag = cameraPositionVelocity.pow(velocitySpeed / this.worldScale).inverse();
            cameraPositionVelocity = cameraPositionVelocity.clone().mul(rotation).mul(rotationDrag);
            if (VoronoiGraph.angularDistanceQuaternion(cameraPositionVelocity, this.worldScale) < Math.PI / 2 * velocityAcceleration / this.worldScale) {
                cameraPositionVelocity = Quaternion.ONE;
            }
            this.soundEvents.push({
                shipId,
                soundType: ESoundType.ACCELERATE,
                soundEventType: ESoundEventType.CONTINUOUS
            });
        }
        if (!disabledMovement && activeKeys.includes("s")) {
            const rotation = cameraPositionVelocity.clone().inverse().pow(Game.BRAKE_POWER / this.worldScale);
            cameraPositionVelocity = cameraPositionVelocity.clone().mul(rotation);
            if (VoronoiGraph.angularDistanceQuaternion(cameraPositionVelocity, this.worldScale) < Math.PI / 2 * velocityAcceleration / this.worldScale) {
                cameraPositionVelocity = Quaternion.ONE;
            }
            this.soundEvents.push({
                shipId,
                soundType: ESoundType.DECELERATE,
                soundEventType: ESoundEventType.CONTINUOUS
            });
        }

        // handle main cannons
        if (!disabledMovement && activeKeys.includes(" ") && !cameraCannonLoading && cannonCoolDown <= 0) {
            cameraCannonLoading = new Date(Date.now());
        }
        if (!disabledMovement && !activeKeys.includes(" ") && cameraCannonLoading && faction && cannonCoolDown <= 0) {
            // cannon fire
            cameraCannonLoading = undefined;
            cannonCoolDown = 20;

            this.soundEvents.push({
                shipId,
                soundType: ESoundType.FIRE,
                soundEventType: ESoundEventType.ONE_OFF
            });

            // fire cannons
            for (let i = 0; i < shipData.cannons.numCannons; i++) {
                // pick left or right side
                let jitterPoint: [number, number, number] = [i % 2 === 0 ? -1 : 1, 0, 0];
                // apply random jitter
                jitterPoint[1] += DelaunayGraph.randomInt() * 0.15;
                jitterPoint = DelaunayGraph.normalize(jitterPoint);
                const fireDirection = cameraOrientation.clone().rotateVector(jitterPoint);
                const fireVelocity = Quaternion.fromBetweenVectors([0, 0, 1], fireDirection).pow(Game.PROJECTILE_SPEED / this.worldScale);

                // create a cannon ball
                const cannonBall = new CannonBall(faction.id, this.ships.get(shipId).id);
                cannonBall.id = `${cameraId}-${Math.floor(Math.random() * 100000000)}`;
                cannonBall.position = cameraPosition.clone();
                cannonBall.positionVelocity = fireVelocity.clone();
                cannonBall.size = 15;
                cannonBall.damage = 10;
                newCannonBalls.push(cannonBall);
            }
        }
        if (!disabledMovement && activeKeys.includes(" ") && cameraCannonLoading && Date.now() - +cameraCannonLoading > 3000) {
            // cancel cannon fire
            cameraCannonLoading = undefined;
        }

        // handle automatic cannonades
        for (let i = 0; i < this.ships.get(shipId).cannonadeCoolDown.length; i++) {
            const cannonadeCoolDown = this.ships.get(shipId).cannonadeCoolDown[i];
            if (!disabledMovement && cannonadeCoolDown <= 0) {
                // find nearby ship
                const targetVector = this.ships.get(shipId).fireControl.getTargetVector();
                if (!targetVector) {
                    continue;
                }

                // aim at ship with slight jitter
                const angle = Math.atan2(targetVector[1], targetVector[0]);
                const jitter = (Math.random() * 2 - 1) * 5 * Math.PI / 180;
                const jitterPoint: [number, number, number] = [
                    Math.cos(jitter + angle),
                    Math.sin(jitter + angle),
                    0
                ];
                const fireDirection = cameraOrientation.clone().rotateVector(jitterPoint);
                const fireVelocity = Quaternion.fromBetweenVectors([0, 0, 1], fireDirection).pow(Game.PROJECTILE_SPEED / this.worldScale);

                // no faction, no cannonballs
                if (!faction) {
                    continue;
                }

                // roll a dice to have random cannonade fire
                if (Math.random() > 0.1) {
                    continue;
                }

                // create a cannon ball
                const cannonBall = new CannonBall(faction.id, this.ships.get(shipId).id);
                cannonBall.id = `${cameraId}-${Math.floor(Math.random() * 100000000)}`;
                cannonBall.position = cameraPosition.clone();
                cannonBall.positionVelocity = fireVelocity.clone();
                cannonBall.size = 15;
                cannonBall.damage = 10;
                newCannonBalls.push(cannonBall);

                this.soundEvents.push({
                    shipId,
                    soundType: ESoundType.FIRE,
                    soundEventType: ESoundEventType.ONE_OFF
                });

                // apply a cool down to the cannonades
                this.ships.get(shipId).cannonadeCoolDown[i] = 45;
            } else if (!disabledMovement && cannonadeCoolDown > 0) {
                this.ships.get(shipId).cannonadeCoolDown[i] = this.ships.get(shipId).cannonadeCoolDown[i] - 1;
            }
        }

        // if (activeKeys.some(key => ["a", "s", "d", "w", " "].includes(key)) && !isAutomated) {
        //     clearPathFindingPoints = true;
        // }

        // apply velocity
        if (cameraPositionVelocity !== Quaternion.ONE) {
            cameraPosition = cameraPosition.clone().mul(cameraPositionVelocity.clone().pow(speedFactor));
        }
        if (cameraOrientationVelocity !== Quaternion.ONE) {
            cameraOrientation = cameraOrientation.clone().mul(cameraOrientationVelocity.clone().pow(speedFactor));
        }
        if (cameraPosition !== this.ships.get(shipId).position && false) {
            const diffQuaternion = this.ships.get(shipId).position.clone().inverse().mul(cameraPosition.clone());
            cameraOrientation = cameraOrientation.clone().mul(diffQuaternion);
        }

        // handle cool downs
        if (cannonCoolDown > 0) {
            cannonCoolDown -= 1;
        }
        this.ships.get(shipId).handleHealthTick();

        // handle buffs
        this.ships.get(shipId).handleBuffTick();

        this.ships.get(shipId).position = cameraPosition;
        this.ships.get(shipId).orientation = cameraOrientation;
        this.ships.get(shipId).positionVelocity = cameraPositionVelocity;
        this.ships.get(shipId).orientationVelocity = cameraOrientationVelocity;
        this.ships.get(shipId).cannonLoading = cameraCannonLoading;
        this.ships.get(shipId).cannonCoolDown = cannonCoolDown;
        if (clearPathFindingPoints) {
            this.ships.get(shipId).pathFinding.points = [];
        }
        if (isAutomated) {
            newCannonBalls.forEach(c => this.cannonBalls.set(c.id, c));
        }

        // emit ship state events if not automated, i.e. is player controlled
        if (!isAutomated) {
            const playerData = Array.from(this.playerData.values()).find(p => p.shipId === this.ships.get(shipId).id);
            if (playerData) {
                const shipStateMessage: IShipStateMessage = {
                    messageType: EMessageType.SHIP_STATE,
                    position: SerializeQuaternion(cameraPosition),
                    positionVelocity: SerializeQuaternion(cameraPositionVelocity),
                    orientation: SerializeQuaternion(cameraOrientation),
                    orientationVelocity: SerializeQuaternion(cameraOrientationVelocity),
                    newCannonBalls: newCannonBalls.map(c => c.serialize())
                };
                this.outgoingMessages.push([playerData.id, shipStateMessage]);
            }
        }
    }

    public static computeIntercept(a: [number, number, number], b: [number, number, number], c: [number, number, number], d: [number, number, number]): [number, number, number] {
        const midPoint = DelaunayGraph.normalize(Game.getAveragePoint([a, b]));
        const n1 = DelaunayGraph.crossProduct(a, b);
        const n2 = DelaunayGraph.crossProduct(c, d);
        const n = DelaunayGraph.crossProduct(n1, n2);
        return DelaunayGraph.dotProduct(n, midPoint) >= 0 ? n : [
            -n[0],
            -n[1],
            -n[2]
        ];
    }

    /**
     * Compute a cannonball collision.
     * @param cannonBall The cannonball to shoot.
     * @param ship The ship to collide against.
     * @param worldScale The size of the world.
     * @private
     */
    public static cannonBallCollision(cannonBall: ICollidable, ship: Ship, worldScale: number): IHitTest {
        const shipData = GetShipData(ship.shipType, ship.planet.instance.shipScale);
        if (!shipData) {
            throw new Error("Could not find ship type");
        }

        const c = cannonBall.position.clone().rotateVector([0, 0, 1]);
        const d = cannonBall.position.clone().mul(
            ship.positionVelocity.clone().inverse().mul(cannonBall.positionVelocity.clone())
        ).rotateVector([0, 0, 1]);
        const cannonBallDistance = VoronoiGraph.angularDistance(c, d, worldScale);

        let hitPoint: [number, number, number] | null = null;
        let hitDistance: number | null = null;
        const hull = Game.getPhysicsHull(shipData.hull, worldScale).map((q): Quaternion => {
            return ship.position.clone().mul(ship.orientation.clone()).mul(q);
        });
        for (let i = 0; i < hull.length; i++) {
            const a = hull[i % hull.length].rotateVector([0, 0, 1]);
            const b = hull[(i + 1) % hull.length].rotateVector([0, 0, 1]);
            const intercept = Game.computeIntercept(a, b, c, d);
            const segmentLength = VoronoiGraph.angularDistance(a, b, worldScale);
            const interceptSegmentLength = VoronoiGraph.angularDistance(a, intercept, worldScale) + VoronoiGraph.angularDistance(intercept, b, worldScale);
            const isInsideSegment = interceptSegmentLength - PHYSICS_SCALE / worldScale * cannonBall.size * 2 <= segmentLength;
            const interceptVelocityLength = VoronoiGraph.angularDistance(c, intercept, worldScale) + VoronoiGraph.angularDistance(intercept, d, worldScale);
            const isInsideVelocity = interceptVelocityLength - PHYSICS_SCALE / worldScale <= cannonBallDistance;
            const interceptDistance = VoronoiGraph.angularDistance(c, intercept, worldScale);
            if (isInsideSegment && isInsideVelocity && (!hitPoint || (hitPoint && hitDistance && interceptDistance < hitDistance))) {
                hitPoint = intercept;
                hitDistance = interceptDistance;
            }
        }

        const hitTime: number | null = hitDistance ? hitDistance / cannonBallDistance : null;
        return {
            success: hitTime !== null && hitTime >= 0 && hitTime < 1,
            distance: hitDistance,
            point: hitPoint,
            time: hitTime,
        };
    }

    private isTradeTick(): boolean {
        if (this.tradeTick <= 0) {
            this.tradeTick = Game.TRADE_TICK_COOL_DOWN;
            return true;
        } else {
            this.tradeTick -= 1;
            return false;
        }
    }

    /**
     * ------------------------------------------------------------------------
     * Server loop
     * ------------------------------------------------------------------------
     */

    private loadGlobalStateMessage(message: IGlobalStateShardMessage) {
        Game.syncNetworkMap(
            this.factions,
            this.computeSyncDelta(this.factions, message.factions.map(f => Faction.deserialize(this, f)), true),
            (v: Faction) => v,
            (s: Faction, v: Faction) => s.deserializeUpdate(v.serialize())
        );
        this.scoreBoard = message.scoreBoard;
    }

    private aiPlayerDataCombined: Map<string, [number, IAIPlayerDataStateShardMessage]> = new Map<string, [number, IAIPlayerDataStateShardMessage]>();
    private readyLoadAIPlayerDataStateMessage(shardName: string, message: IAIPlayerDataStateShardMessage) {
        // add data to the frame
        this.aiPlayerDataCombined.set(shardName, [0, message]);
    }
    private loadAIPlayerDataStateMessage() {
        // apply data to game state
        const sortedData = [...this.aiPlayerDataCombined.values()].sort(([a], [b]) => a - b).map(([,m]) => m);
        Game.syncNetworkArray(
            this.playerData,
            this.computeSyncDelta(this.playerData, sortedData.reduce((acc, m) => [...acc, ...m.playerData], [] as IPlayerData[]), true),
            (o) => {
                const moneyAccount: MoneyAccount = new MoneyAccount();
                moneyAccount.currencies = o.moneyAccount.currencies;
                const d: IPlayerData = {
                    id: o.id,
                    name: o.name,
                    factionId: o.factionId,
                    planetId: o.planetId,
                    shipId: o.shipId,
                    activeKeys: [...o.activeKeys],
                    filterActiveKeys: !!o.filterActiveKeys ? [...o.filterActiveKeys] : o.filterActiveKeys,
                    moneyAccount,
                    autoPilotEnabled: o.autoPilotEnabled,
                    aiNodeName: o.aiNodeName
                };
                return d;
            },
            (o, d) => {
                o.id = d.id;
                o.name = d.name;
                o.factionId = d.factionId;
                o.planetId = d.planetId;
                o.shipId = d.shipId;
                o.activeKeys = d.activeKeys;
                o.filterActiveKeys = d.filterActiveKeys;
                o.moneyAccount.currencies = d.moneyAccount.currencies;
                o.autoPilotEnabled = d.autoPilotEnabled;
                o.aiNodeName = d.aiNodeName;
                return o;
            }
        );
        for (const item of sortedData.reduce((acc, m) => [...acc, ...m.ships], [] as Array<{
            shipId: string;
            shipKeys: string[];
            orders: ISerializedOrder[];
            pathFinding: ISerializedPathFinder;
            fireControl: ISerializedFireControl;
        }>)) {
            const ship = this.ships.get(item.shipId);
            if (ship) {
                ship.activeKeys.splice(0, ship.activeKeys.length, ...item.shipKeys);
                ship.orders.splice(0, ship.orders.length, ...item.orders.map(o => Order.deserialize(this, ship, o)));
                ship.pathFinding = PathFinder.deserialize(ship, item.pathFinding);
                ship.fireControl = FireControl.deserialize(this, ship, item.fireControl);
            }
        }

        // clear old data to reset frame
        for (const [key, [tick, message]] of [...this.aiPlayerDataCombined.entries()]) {
            if (tick > 10) {
                this.aiPlayerDataCombined.delete(key);
            } else {
                this.aiPlayerDataCombined.set(key, [tick + 1, message]);
            }
        }
    }

    private physicsDataCombined: Map<string, [number, IPhysicsDataStateShardMessage]> = new Map<string, [number, IPhysicsDataStateShardMessage]>();
    private readyLoadPhysicsDataStateMessage(shardName: string, message: IPhysicsDataStateShardMessage) {
        // add data to the frame
        this.physicsDataCombined.set(shardName, [0, message]);
    }
    private loadPhysicsDataStateMessages() {
        // apply data to game state
        const sortedData = [...this.physicsDataCombined.values()].sort(([a], [b]) => a - b).map(([,m]) => m);
        const replaceFirstInstance = <T>(c: [boolean, string, T][]): T[] => {
            const items: Map<string, T> = new Map<string, T>();
            for (const item of c) {
                if (items.has(item[1])) {
                    if (!item[0]) {
                        // not transferring, override
                        items.set(item[1], item[2]);
                    }
                } else {
                    // does not exist, fill
                    items.set(item[1], item[2]);
                }
            }
            return [...items.values()];
        };
        const ships = replaceFirstInstance(
            sortedData.reduce((acc, m) => [...acc, ...m.ships.map(i => [m.transferIds.includes(i.id), i.id, i] as [boolean, string, ISerializedShip])], [] as [boolean, string, ISerializedShip][])
        ).map(s => Ship.deserialize(this, s));
        const cannonBalls = replaceFirstInstance(
            sortedData.reduce((acc, m) => [...acc, ...m.cannonBalls.map(i => [m.transferIds.includes(i.id), i.id, i] as [boolean, string, ISerializedCannonBall])], [] as [boolean, string, ISerializedCannonBall][])
        ).map(s => CannonBall.deserialize(s));
        const crates = replaceFirstInstance(
            sortedData.reduce((acc, m) => [...acc, ...m.crates.map(i => [m.transferIds.includes(i.id), i.id, i] as [boolean, string, ISerializedCrate])], [] as [boolean, string, ISerializedCrate][])
        ).map(s => Crate.deserialize(s));

        Game.syncNetworkArray(
            this.ships,
            this.computeSyncDelta(this.ships, ships, true),
            (o) => o,
            (o, d) => o.deserializeUpdate(d.serialize())
        );
        Game.syncNetworkArray(
            this.cannonBalls,
            this.computeSyncDelta(this.cannonBalls, cannonBalls, true),
            (o) => o,
            (o, d) => o.deserializeUpdate(d.serialize())
        );
        Game.syncNetworkArray(
            this.crates,
            this.computeSyncDelta(this.crates, crates, true),
            (o) => o,
            (o, d) => o.deserializeUpdate(d.serialize())
        );
        for (const item of sortedData.reduce((acc, m) => [...acc, ...m.planets], [] as ISerializedPlanetFull[])) {
            const planet = this.planets.get(item.id);
            if (planet) {
                planet.deserializeUpdateFull(item);
            }
        }

        // clear the frame
        for (const [key, [tick, message]] of [...this.physicsDataCombined.entries()]) {
            if (tick > 10) {
                this.physicsDataCombined.delete(key);
            } else {
                this.physicsDataCombined.set(key, [tick + 1, message]);
            }
        }
    }

    /**
     * Handle the data loading functions of a server shard.
     */
    public handleServerShardPreLoop() {
        while (true) {
            const item = this.incomingShardMessages.shift();
            if (item) {
                const [fromShardName, message] = item;
                switch (this.serverType) {
                    case EServerType.LOAD_BALANCER: {
                        switch (message.shardMessageType) {
                            case EShardMessageType.JOIN_ALIAS: {
                                const {
                                    playerId,
                                    name,
                                } = message as IJoinAliasShardMessage;
                                this.playerIdAliases.set(name, playerId); // set
                                break;
                            }
                            case EShardMessageType.SPAWN_AI_SHIP: {
                                // forward message to the best AI node
                                const bestShardCount = Array.from(this.aiShardCount.values()).sort((a, b) => a.numAI - b.numAI)[0];
                                const aiShard = this.shardList.get(bestShardCount.name);
                                this.outgoingShardMessages.push([aiShard.name, message]);
                                bestShardCount.numAI += 1;
                                break;
                            }
                            case EShardMessageType.SPAWN_SHIP: {
                                // forward message to the best AI node
                                const {playerId} = message as ISpawnShardMessage;
                                const bestShardCount = Array.from(this.aiShardCount.values()).find(s => s.players.includes(playerId));
                                const aiShard = this.shardList.get(bestShardCount.name);
                                const spawnMessage: ISpawnShardMessage = {
                                    ...(message as ISpawnShardMessage),
                                    playerId: this.playerIdAliases.get(playerId) ?? playerId // load balancer -> AI
                                };
                                this.outgoingShardMessages.push([aiShard.name, spawnMessage]);
                                bestShardCount.numAI += 1;
                                break;
                            }
                            case EShardMessageType.CLAIM_PLANET: {
                                // forward message to all nodes except the sender node
                                for (const [,shard] of this.shardList) {
                                    if (![this.shardName, fromShardName].includes(shard.name) && [EServerType.GLOBAL_STATE_NODE, EServerType.AI_NODE, EServerType.PHYSICS_NODE].includes(shard.type)) {
                                        this.outgoingShardMessages.push([shard.name, message]);
                                    }
                                }
                                break;
                            }
                            case EShardMessageType.DESTROY_SHIP_PLANET: {
                                // forward message to physics node
                                const {
                                    planetId
                                } = message as IDestroyShipPlanetShardMessage;
                                const planet = this.planets.get(planetId);
                                if (planet) {
                                    const kingdomIndex = planet.county.duchy.kingdom.terrain.kingdoms.indexOf(planet.county.duchy.kingdom);
                                    const physicsNode = Array.from(this.shardList.values()).find(s => s.type === EServerType.PHYSICS_NODE && s.kingdomIndex === kingdomIndex);
                                    if (physicsNode) {
                                        this.outgoingShardMessages.push([physicsNode.name, message]);
                                    }
                                }
                                break;
                            }
                            case EShardMessageType.TRIBUTE_SHIP_PLANET: {
                                // forward message to physics node
                                const {
                                    planetId
                                } = message as ITributeShipPlanetShardMessage;
                                const planet = this.planets.get(planetId);
                                if (planet) {
                                    const kingdomIndex = planet.county.duchy.kingdom.terrain.kingdoms.indexOf(planet.county.duchy.kingdom);
                                    const physicsNode = Array.from(this.shardList.values()).find(s => s.type === EServerType.PHYSICS_NODE && s.kingdomIndex === kingdomIndex);
                                    if (physicsNode) {
                                        this.outgoingShardMessages.push([physicsNode.name, message]);
                                    }
                                }
                                break;
                            }
                            case EShardMessageType.TRADE_SHIP_PLANET: {
                                // forward message to physics node
                                const {
                                    planetId
                                } = message as ITradeShipPlanetShardMessage;
                                const planet = this.planets.get(planetId);
                                if (planet) {
                                    const kingdomIndex = planet.county.duchy.kingdom.terrain.kingdoms.indexOf(planet.county.duchy.kingdom);
                                    const physicsNode = Array.from(this.shardList.values()).find(s => s.type === EServerType.PHYSICS_NODE && s.kingdomIndex === kingdomIndex);
                                    if (physicsNode) {
                                        this.outgoingShardMessages.push([physicsNode.name, message]);
                                    }
                                }
                                break;
                            }
                        }
                        break;
                    }
                    case EServerType.GLOBAL_STATE_NODE: {
                        switch (message.shardMessageType) {
                            case EShardMessageType.DAMAGE_SCORE: {
                                const {
                                    playerId,
                                    name,
                                    damage
                                } = message as IDamageScoreShardMessage;

                                const item = this.scoreBoard.damage.find(i => i.playerId === playerId);
                                if (item) {
                                    item.damage += damage;
                                } else {
                                    this.scoreBoard.damage.push({
                                        playerId,
                                        name,
                                        damage
                                    });
                                }
                                this.scoreBoard.damage.sort((a, b) => b.damage - a.damage);
                                break;
                            }
                            case EShardMessageType.LOOT_SCORE: {
                                const {
                                    playerId,
                                    name,
                                    count
                                } = message as ILootScoreShardMessage;

                                const item = this.scoreBoard.loot.find(i => i.playerId === playerId);
                                if (item) {
                                    item.count += count;
                                } else {
                                    this.scoreBoard.loot.push({
                                        playerId,
                                        name,
                                        count
                                    });
                                }
                                this.scoreBoard.loot.sort((a, b) => b.count - a.count);
                                break;
                            }
                            case EShardMessageType.CLAIM_PLANET: {
                                const {
                                    planetId,
                                    factionId
                                } = message as IClaimPlanetShardMessage;

                                const faction = this.factions.get(factionId) ?? null;
                                const planet = this.planets.get(planetId);
                                planet.claim(faction, false, null);
                                break;
                            }
                            case EShardMessageType.CREATE_SHIP_FACTION: {
                                const {
                                    factionId,
                                    shipId,
                                    shipType
                                } = message as ICreateShipFactionShardMessage;

                                const faction = this.factions.get(factionId) ?? null;
                                faction.shipIds.push(shipId);
                                faction.shipsAvailable[shipType] += 1;
                                break;
                            }
                            case EShardMessageType.DESTROY_SHIP_FACTION: {
                                const {
                                    factionId,
                                    shipId
                                } = message as IDestroyShipFactionShardMessage;

                                const ship = this.ships.get(shipId);
                                const faction = this.factions.get(factionId) ?? null;
                                faction.handleShipDestroyed(ship, false);
                                break;
                            }
                            case EShardMessageType.AI_PLAYER_DATA_STATE: {
                                this.readyLoadAIPlayerDataStateMessage(fromShardName, message as IAIPlayerDataStateShardMessage);
                                break;
                            }
                            case EShardMessageType.PHYSICS_DATA_STATE: {
                                this.readyLoadPhysicsDataStateMessage(fromShardName, message as IPhysicsDataStateShardMessage);
                                break;
                            }
                        }
                        break;
                    }
                    case EServerType.AI_NODE: {
                        switch (message.shardMessageType) {
                            case EShardMessageType.JOIN_ALIAS: {
                                const {
                                    playerId,
                                    name,
                                } = message as IJoinAliasShardMessage;
                                this.playerIdAliases.set(name, playerId); // set
                                break;
                            }
                            case EShardMessageType.SPAWN_AI_SHIP: {
                                const {
                                    planetId
                                } = message as ISpawnAiShardMessage;
                                const planet = this.planets.get(planetId);
                                if (planet) {
                                    const kingdomIndex = planet.county.duchy.kingdom.terrain.kingdoms.indexOf(planet.county.duchy.kingdom);
                                    const physicsNode = Array.from(this.shardList.values()).find(s => s.type === EServerType.PHYSICS_NODE && s.kingdomIndex === kingdomIndex);
                                    if (physicsNode) {
                                        this.outgoingShardMessages.push([physicsNode.name, message]);
                                    }
                                }
                                break;
                            }
                            case EShardMessageType.SPAWN_AI_SHIP_RESULT: {
                                const {
                                    shipId
                                } = message as ISpawnAiResultShardMessage;
                                this.monitoredShips.add(shipId);
                                const loadBalancer = Array.from(this.shardList.values()).find(s => s.type === EServerType.LOAD_BALANCER);
                                if (loadBalancer) {
                                    this.outgoingShardMessages.push([loadBalancer.name, message]);
                                }
                                break;
                            }
                            case EShardMessageType.SPAWN_SHIP: {
                                const {
                                    planetId
                                } = message as ISpawnShardMessage;
                                const planet = this.planets.get(planetId);
                                if (planet) {
                                    const kingdomIndex = planet.county.duchy.kingdom.terrain.kingdoms.indexOf(planet.county.duchy.kingdom);
                                    const physicsNode = Array.from(this.shardList.values()).find(s => s.type === EServerType.PHYSICS_NODE && s.kingdomIndex === kingdomIndex);
                                    if (physicsNode) {
                                        this.outgoingShardMessages.push([physicsNode.name, message]);
                                    }
                                }
                                break;
                            }
                            case EShardMessageType.SPAWN_SHIP_RESULT: {
                                const {
                                    playerId,
                                    shipId
                                } = message as ISpawnResultShardMessage;
                                const player = this.playerData.get(playerId);
                                if (!player) {
                                    continue;
                                }
                                player.shipId = shipId;
                                this.monitoredShips.add(shipId);
                                const loadBalancer = Array.from(this.shardList.values()).find(s => s.type === EServerType.LOAD_BALANCER);
                                if (loadBalancer) {
                                    this.outgoingShardMessages.push([loadBalancer.name, message]);
                                }
                                break;
                            }
                            case EShardMessageType.CLAIM_PLANET: {
                                const {
                                    planetId,
                                    factionId
                                } = message as IClaimPlanetShardMessage;

                                const faction = this.factions.get(factionId) ?? null;
                                const planet = this.planets.get(planetId);
                                planet.claim(faction, false, null);

                                const claimPlanetMessage: IClaimPlanetMessage = {
                                    messageType: EMessageType.CLAIM_PLANET,
                                    planetId,
                                    factionId,
                                };
                                for (const [,playerData] of this.playerData) {
                                    this.outgoingMessages.push([playerData.id, claimPlanetMessage]);
                                }
                                break;
                            }
                            case EShardMessageType.FETCH_ORDER_RESULT: {
                                const {
                                    order,
                                    shipId
                                } = message as IFetchOrderResultShardMessage;
                                const ship = this.ships.get(shipId);
                                if (!ship) {
                                    continue;
                                }
                                ship.orders.push(Order.deserialize(this, ship, order));
                                this.fetchingOrder.delete(ship.id);
                                break;
                            }
                            case EShardMessageType.DEATH: {
                                const {
                                    playerId
                                } = message as IDeathShardMessage;
                                const player = this.playerData.get(playerId);
                                if (!player) {
                                    continue;
                                }
                                player.shipId = "";
                                break;
                            }
                            case EShardMessageType.GLOBAL_STATE: {
                                this.loadGlobalStateMessage(message as IGlobalStateShardMessage);
                                break;
                            }
                            case EShardMessageType.PHYSICS_DATA_STATE: {
                                this.readyLoadPhysicsDataStateMessage(fromShardName, message as IPhysicsDataStateShardMessage);
                                break;
                            }
                        }
                        break;
                    }
                    case EServerType.PHYSICS_NODE: {
                        switch (message.shardMessageType) {
                            case EShardMessageType.FETCH_ORDER: {
                                const fetchOrderMessage = message as IFetchOrderShardMessage;
                                const {
                                    shipId,
                                } = fetchOrderMessage;
                                const ship = this.ships.get(shipId);
                                const order = ship.planet.getOrder(ship);

                                const fetchOrderResultMessage: IFetchOrderResultShardMessage = {
                                    shardMessageType: EShardMessageType.FETCH_ORDER_RESULT,
                                    shipId,
                                    order: order.serialize(),
                                };
                                this.outgoingShardMessages.push([fromShardName, fetchOrderResultMessage]);
                                break;
                            }
                            case EShardMessageType.SPAWN_AI_SHIP: {
                                const spawnMessage = message as ISpawnAiShardMessage;
                                const {
                                    planetId,
                                    shipType
                                } = spawnMessage;
                                const planet = this.planets.get(planetId);
                                const ship = planet.spawnShip(planet.moneyAccount.cash, shipType, true);

                                const spawnAiShipResultMessage: ISpawnAiResultShardMessage = {
                                    shardMessageType: EShardMessageType.SPAWN_AI_SHIP_RESULT,
                                    shipId: ship.id
                                };
                                this.outgoingShardMessages.push([fromShardName, spawnAiShipResultMessage]);
                                this.spawningPlanets.delete(planetId);
                                break;
                            }
                            case EShardMessageType.SPAWN_SHIP: {
                                const spawnMessage = message as ISpawnShardMessage;
                                const {
                                    shipType,
                                    planetId,
                                    playerId
                                } = spawnMessage;
                                const planet = this.planets.get(planetId);

                                const player = this.playerData.get(playerId);
                                if (!player) {
                                    continue;
                                }
                                const asFaction = !player.moneyAccount.hasEnough(planet.shipyard.quoteShip(shipType));
                                const playerShip = planet.shipyard.buyShip(player.moneyAccount, shipType, asFaction);
                                player.shipId = playerShip.id;

                                const spawnShipResultMessage: ISpawnResultShardMessage = {
                                    shardMessageType: EShardMessageType.SPAWN_SHIP_RESULT,
                                    playerId,
                                    shipId: playerShip.id
                                };
                                this.outgoingShardMessages.push([fromShardName, spawnShipResultMessage]);
                                break;
                            }
                            case EShardMessageType.CLAIM_PLANET: {
                                const {
                                    planetId,
                                    factionId
                                } = message as IClaimPlanetShardMessage;

                                const faction = this.factions.get(factionId) ?? null;
                                const planet = this.planets.get(planetId);
                                planet.claim(faction, false, null);
                                break;
                            }
                            case EShardMessageType.DESTROY_SHIP_PLANET: {
                                const {
                                    planetId,
                                    shipId
                                } = message as IDestroyShipPlanetShardMessage;

                                const ship = this.ships.get(shipId);
                                if (!ship) {
                                    return;
                                }
                                const planet = this.planets.get(planetId);
                                planet.handleShipDestroyed(ship, false);
                                break;
                            }
                            case EShardMessageType.TRIBUTE_SHIP_PLANET: {
                                const {
                                    planetId,
                                    shipId
                                } = message as ITributeShipPlanetShardMessage;

                                const ship = this.ships.get(shipId);
                                const planet = this.planets.get(planetId);
                                planet.tribute(ship, false);
                                break;
                            }
                            case EShardMessageType.TRADE_SHIP_PLANET: {
                                const {
                                    planetId,
                                    shipId,
                                    unload,
                                    specificBuy
                                } = message as ITradeShipPlanetShardMessage;

                                const ship = this.ships.get(shipId);
                                const planet = this.planets.get(planetId);
                                planet.trade(ship, false, unload, specificBuy);
                                break;
                            }
                            case EShardMessageType.INVEST_DEPOSIT_AMOUNT: {
                                const investMessage = message as IInvestDepositShardMessage;
                                const {
                                    amount,
                                    planetId,
                                    playerId
                                } = investMessage;
                                const planet = this.planets.get(planetId);

                                const player = this.playerData.get(playerId);
                                if (!player) {
                                    continue;
                                }

                                const payment = {currencyId: "GOLD", amount};
                                if (planet && player && player.moneyAccount.hasEnough([payment])) {
                                    planet.depositInvestment(playerId, player.moneyAccount, payment);
                                }
                                break;
                            }
                            case EShardMessageType.INVEST_WITHDRAW_AMOUNT: {
                                const investMessage = message as IInvestWithdrawShardMessage;
                                const {
                                    amount,
                                    planetId,
                                    playerId
                                } = investMessage;
                                const planet = this.planets.get(planetId);

                                const player = this.playerData.get(playerId);
                                if (!player) {
                                    continue;
                                }

                                const payment = {currencyId: "GOLD", amount};
                                if (planet && player) {
                                    planet.withdrawInvestment(playerId, player.moneyAccount, payment);
                                }
                                break;
                            }
                            case EShardMessageType.SHIP_STATE: {
                                const shipStateMessage = message as IShipStateShardMessage;
                                const playerId = shipStateMessage.playerId;

                                const player = this.playerData.get(playerId);
                                if (!player) {
                                    continue;
                                }

                                const ship = this.ships.get(player.shipId);
                                if (ship) {
                                    // update ship position
                                    ship.position = DeserializeQuaternion(shipStateMessage.position);
                                    ship.positionVelocity = DeserializeQuaternion(shipStateMessage.positionVelocity);
                                    ship.orientation = DeserializeQuaternion(shipStateMessage.orientation);
                                    ship.orientationVelocity = DeserializeQuaternion(shipStateMessage.orientationVelocity);

                                    // add new cannonballs
                                    shipStateMessage.newCannonBalls.map(c => CannonBall.deserialize(c)).forEach(c => {
                                        this.cannonBalls.set(c.id, c);
                                    });
                                }
                                break;
                            }
                            case EShardMessageType.GLOBAL_STATE: {
                                this.loadGlobalStateMessage(message as IGlobalStateShardMessage);
                                break;
                            }
                            case EShardMessageType.AI_PLAYER_DATA_STATE: {
                                this.readyLoadAIPlayerDataStateMessage(fromShardName, message as IAIPlayerDataStateShardMessage);
                                break;
                            }
                            case EShardMessageType.PHYSICS_DATA_STATE: {
                                this.readyLoadPhysicsDataStateMessage(fromShardName, message as IPhysicsDataStateShardMessage);
                                break;
                            }
                        }
                        break;
                    }
                }
            } else {
                break;
            }
        }
        switch (this.serverType) {
            case EServerType.GLOBAL_STATE_NODE: {
                this.loadPhysicsDataStateMessages();
                this.loadAIPlayerDataStateMessage();
                break;
            }
            case EServerType.AI_NODE: {
                this.aiPlayerDataCombined.set(this.shardName, [-1, {
                    shardMessageType: EShardMessageType.AI_PLAYER_DATA_STATE,
                    playerData: Array.from(this.playerData.values()),
                    ships: Array.from(this.ships.values()).filter(s => this.monitoredShips.has(s.id)).map((s) => ({
                        shipId: s.id,
                        shipKeys: s.activeKeys,
                        orders: s.orders.map(o => o.serialize()),
                        pathFinding: s.pathFinding.serialize(),
                        fireControl: s.fireControl.serialize(),
                    })),
                }]);
                this.loadPhysicsDataStateMessages();
                this.loadAIPlayerDataStateMessage();
                break;
            }
            case EServerType.PHYSICS_NODE: {
                const isInKingdom = (c: ICameraState): boolean => {
                    const planet = this.voronoiTerrain.getNearestPlanet(c.position.rotateVector([0, 0, 1]));
                    return this.voronoiTerrain.kingdoms.indexOf(planet.county.duchy.kingdom) === this.physicsKingdomIndex;
                };

                // update ships for at least one second after leaving the node
                for (const [key, value] of [...this.updatingIds.entries()]) {
                    if (value < 10) {
                        this.updatingIds.set(key, value + 1);
                    } else {
                        this.updatingIds.delete(key);
                    }
                }
                for (const [, ship] of this.ships) {
                    if (isInKingdom(ship)) {
                        this.updatingIds.set(ship.id, 0);
                    }
                }
                for (const [, crate] of this.crates) {
                    if (isInKingdom(crate)) {
                        this.updatingIds.set(crate.id, 0);
                    }
                }
                for (const [, cannonBall] of this.cannonBalls) {
                    if (isInKingdom(cannonBall)) {
                        this.updatingIds.set(cannonBall.id, 0);
                    }
                }

                // add current ships to the list of ships to load
                const isUpdated = (c: ICameraState): boolean => isInKingdom(c) || this.updatingIds.has(c.id);
                this.physicsDataCombined.set(this.shardName, [-1, {
                    shardMessageType: EShardMessageType.PHYSICS_DATA_STATE,
                    planets: [],
                    ships: Array.from(this.ships.values()).filter(isUpdated).map(s => s.serialize()),
                    crates: Array.from(this.crates.values()).filter(isUpdated).map(s => s.serialize()),
                    cannonBalls: Array.from(this.cannonBalls.values()).filter(isUpdated).map(s => s.serialize()),
                    transferIds: [...this.updatingIds.entries()].reduce((acc, [key, value]) => {
                        if (value > 0) {
                            acc.push(key);
                        }
                        return acc;
                    }, [] as string[])
                }]);
                this.loadPhysicsDataStateMessages();
                this.loadAIPlayerDataStateMessage();
                break;
            }
        }
    }

    /**
     * Handle the data sending function of a server shard
     */
    public handleServerShardPostLoop() {
        switch (this.serverType) {
            case EServerType.LOAD_BALANCER: {
                break;
            }
            case EServerType.GLOBAL_STATE_NODE: {
                // give everyone a copy of the global faction state
                const globalStateMessage: IGlobalStateShardMessage = {
                    shardMessageType: EShardMessageType.GLOBAL_STATE,
                    factions: Array.from(this.factions.values()).map(f => f.serialize()),
                    scoreBoard: this.scoreBoard,
                };
                for (const [, shard] of this.shardList) {
                    if ([EServerType.AI_NODE, EServerType.PHYSICS_NODE].includes(shard.type)) {
                        this.outgoingShardMessages.push([shard.name, globalStateMessage]);
                    }
                }
                break;
            }
            case EServerType.AI_NODE: {
                const physicsNodeMessages = new Map<number, IAIPlayerDataStateShardMessage>();
                const globalNodeMessage: IAIPlayerDataStateShardMessage = {
                    shardMessageType: EShardMessageType.AI_PLAYER_DATA_STATE,
                    playerData: [],
                    ships: []
                };

                // send player data to all physics nodes
                for (const [, playerData] of this.playerData) {
                    for (let kingdomIndex = 0; kingdomIndex < this.voronoiTerrain.kingdoms.length; kingdomIndex++) {
                        if (!physicsNodeMessages.has(kingdomIndex)) {
                            physicsNodeMessages.set(kingdomIndex, {
                                shardMessageType: EShardMessageType.AI_PLAYER_DATA_STATE,
                                playerData: [],
                                ships: []
                            });
                        }
                        physicsNodeMessages.get(kingdomIndex).playerData.push(playerData);
                    }
                    globalNodeMessage.playerData.push(playerData);
                }
                // send ship data to correct physics node
                for (const shipId of this.monitoredShips) {
                    const ship = this.ships.get(shipId);
                    if (ship) {
                        // send to physics node
                        const planet = this.voronoiTerrain.getNearestPlanet(ship.position.rotateVector([0, 0, 1]));
                        const kingdomIndex = planet.county.duchy.kingdom.terrain.kingdoms.indexOf(planet.county.duchy.kingdom);
                        if (!physicsNodeMessages.has(kingdomIndex)) {
                            physicsNodeMessages.set(kingdomIndex, {
                                shardMessageType: EShardMessageType.AI_PLAYER_DATA_STATE,
                                playerData: [],
                                ships: []
                            });
                        }
                        physicsNodeMessages.get(kingdomIndex).ships.push({
                            shipId: ship.id,
                            orders: ship.orders.map(s => s.serialize()),
                            shipKeys: [...ship.activeKeys],
                            pathFinding: ship.pathFinding.serialize(),
                            fireControl: ship.fireControl.serialize(),
                        });

                        // send to global node
                        globalNodeMessage.ships.push({
                            shipId: ship.id,
                            orders: ship.orders.map(s => s.serialize()),
                            shipKeys: [...ship.activeKeys],
                            pathFinding: ship.pathFinding.serialize(),
                            fireControl: ship.fireControl.serialize(),
                        });
                    }
                }

                // send data to each server
                for (const [, shard] of this.shardList) {
                    if (shard.type === EServerType.GLOBAL_STATE_NODE) {
                        this.outgoingShardMessages.push([shard.name, globalNodeMessage]);
                    } else if (shard.type === EServerType.PHYSICS_NODE && physicsNodeMessages.has(shard.kingdomIndex)) {
                        this.outgoingShardMessages.push([shard.name, physicsNodeMessages.get(shard.kingdomIndex)]);
                    }
                }
                break;
            }
            case EServerType.PHYSICS_NODE: {
                const ships: Ship[] = [];
                const cannonBalls: CannonBall[] = [];
                const crates: Crate[] = [];
                const planets: Planet[] = [];

                // detect objects within the domain
                const isInKingdom = (c: ICameraState): boolean => {
                    const planet = this.voronoiTerrain.getNearestPlanet(c.position.rotateVector([0, 0, 1]));
                    return this.voronoiTerrain.kingdoms.indexOf(planet.county.duchy.kingdom) === this.physicsKingdomIndex;
                };
                const isUpdatable = (c: ICameraState): boolean => isInKingdom(c) || this.updatingIds.has(c.id);
                for (const [, ship] of this.ships) {
                    if (!isUpdatable(ship)) {
                        continue;
                    }
                    ships.push(ship);
                }
                for (const [, cannonBall] of this.cannonBalls) {
                    if (!isUpdatable(cannonBall)) {
                        continue;
                    }
                    cannonBalls.push(cannonBall);
                }
                for (const [, crate] of this.crates) {
                    if (!isUpdatable(crate)) {
                        continue;
                    }
                    crates.push(crate);
                }
                for (const [, planet] of this.planets) {
                    const kingdomIndex = planet.county.duchy.kingdom.terrain.kingdoms.indexOf(planet.county.duchy.kingdom);
                    if (kingdomIndex !== this.physicsKingdomIndex) {
                        continue;
                    }
                    planets.push(planet);
                }

                const physicsSyncFrameMessage: IPhysicsDataStateShardMessage = {
                    shardMessageType: EShardMessageType.PHYSICS_DATA_STATE,
                    ships: ships.map(s => s.serialize()),
                    cannonBalls: cannonBalls.map(c => c.serialize()),
                    crates: crates.map(c => c.serialize()),
                    planets: planets.map(p => p.serializeFull()),
                    transferIds: [...this.updatingIds.entries()].reduce((acc, [key, value]) => {
                        if (value > 0) {
                            acc.push(key);
                        }
                        return acc;
                    }, [] as string[]),
                };

                for (const [, shard] of this.shardList) {
                    if (shard.type === EServerType.PHYSICS_NODE) {
                        // update neighbor physics shard
                        const kingdom = this.voronoiTerrain.kingdoms[this.physicsKingdomIndex];
                        if (kingdom.neighborKingdoms.map(k => this.voronoiTerrain.kingdoms.indexOf(k)).includes(shard.kingdomIndex)) {
                            this.outgoingShardMessages.push([shard.name, physicsSyncFrameMessage]);
                        }
                    } else if (shard.type === EServerType.AI_NODE || shard.type === EServerType.GLOBAL_STATE_NODE) {
                        this.outgoingShardMessages.push([shard.name, physicsSyncFrameMessage]);
                    }
                }
                break;
            }
        }
    }

    /**
     * Handle scripts which modify the game environment. An example is a tutorial script which plays audio files and
     * spawn enemy ships.
     */
    public handleServerScriptEvents() {
        const continueScriptEvents: Array<IterableIterator<void>> = [];
        for (const scriptEvent of this.scriptEvents) {
            const result = scriptEvent.next();
            if (!result.done) {
                continueScriptEvents.push(scriptEvent);
            }
        }
        this.scriptEvents = continueScriptEvents;
    }

    /**
     * Handle server responsibilities. Move things around and compute collisions.
     */
    public handleServerLoop() {
        // deep copy the score board
        this.scoreBoard = JSON.parse(JSON.stringify(this.scoreBoard));

        // clear the sound events
        this.soundEvents = [];

        this.handleServerShardPreLoop();

        // DONE - should be converted into SHARD FORMAT
        // handle player input, if in shard mode, forward from  browser -> AI -> Physics
        // handle player input
        // the AI will remember the player's keys and send special spawn ship messages to the Physics
        if ([EServerType.STANDALONE, EServerType.AI_NODE].includes(this.serverType)) {
            // handle keystrokes
            while (true) {
                const item = this.incomingMessages.shift();
                if (item) {
                    const [playerId, message] = item;
                    // has a message, process the message
                    if (message.messageType === EMessageType.JOIN) {
                        const joinMessage = message as IJoinMessage;

                        let player: IPlayerData = this.playerData.get(playerId);
                        if (!player) {
                            player = {
                                id: playerId,
                                name: joinMessage.name,
                                factionId: null,
                                planetId: null,
                                shipId: "",
                                activeKeys: [],
                                moneyAccount: new MoneyAccount(500),
                                autoPilotEnabled: true,
                                aiNodeName: this.aiNodeName
                            };
                            this.playerData.set(player.id, player);
                        }

                        if ([EServerType.AI_NODE].includes(this.serverType)) {
                            const loadBalancerShard = Array.from(this.shardList.values()).find(s => s.type === EServerType.LOAD_BALANCER);
                            const joinAliasMessage: IJoinAliasShardMessage = {
                                shardMessageType: EShardMessageType.JOIN_ALIAS,
                                playerId,
                                name: this.playerIdAliases.get(player.name) ?? player.name, // AI -> Load Balancer
                            }
                            this.outgoingShardMessages.push([loadBalancerShard.name, joinAliasMessage]);
                        }

                    } else if (message.messageType === EMessageType.CHOOSE_FACTION) {
                        const chooseFactionMessage = message as IChooseFactionMessage;

                        const player = this.playerData.get(playerId);
                        if (!player) {
                            continue;
                        }
                        player.factionId = chooseFactionMessage.factionId;

                        if (player.factionId === null) {
                            player.planetId = null;
                            player.shipId = "";
                        }
                    } else if (message.messageType === EMessageType.CHOOSE_PLANET) {
                        const choosePlanetMessage = message as IChoosePlanetMessage;

                        const player = this.playerData.get(playerId);
                        if (!player) {
                            continue;
                        }
                        player.planetId = choosePlanetMessage.planetId;

                        if (player.planetId === null) {
                            player.shipId = "";
                        }
                    } else if (message.messageType === EMessageType.SPAWN) {
                        const spawnMessage = message as ISpawnMessage;
                        const {
                            shipType,
                            planetId
                        } = spawnMessage;
                        const planet = this.planets.get(planetId);

                        const player = this.playerData.get(playerId);
                        if (!player) {
                            continue;
                        }

                        if (planet && player && (player.moneyAccount.hasEnough(planet.shipyard.quoteShip(shipType)) || shipType === EShipType.CUTTER)) {
                            if ([EServerType.STANDALONE].includes(this.serverType)) {
                                const asFaction = !player.moneyAccount.hasEnough(planet.shipyard.quoteShip(shipType));
                                const playerShip = planet.shipyard.buyShip(player.moneyAccount, shipType, asFaction);
                                player.shipId = playerShip.id;
                            } else if ([EServerType.AI_NODE].includes(this.serverType) && this.playerIdAliases.has(player.name)) { // check
                                const loadBalancer = Array.from(this.shardList.values()).find(s => s.type === EServerType.LOAD_BALANCER);
                                const spawnShipMessage: ISpawnShardMessage = {
                                    shardMessageType: EShardMessageType.SPAWN_SHIP,
                                    shipType,
                                    planetId,
                                    playerId: this.playerIdAliases.get(player.name) // AI -> Load balancer
                                };
                                this.outgoingShardMessages.push([loadBalancer.name, spawnShipMessage]);
                            }
                        }
                    } else if (message.messageType === EMessageType.INVEST_DEPOSIT) {
                        const investMessage = message as IInvestDepositMessage;
                        const {
                            amount,
                            planetId
                        } = investMessage;
                        const planet = this.planets.get(planetId);

                        const player = this.playerData.get(playerId);
                        if (!player) {
                            continue;
                        }

                        const payment = {currencyId: "GOLD", amount};
                        if (planet && player && player.moneyAccount.hasEnough([payment])) {
                            if ([EServerType.STANDALONE].includes(this.serverType)) {
                                planet.depositInvestment(playerId, player.moneyAccount, payment);
                            } else if ([EServerType.AI_NODE].includes(this.serverType)) {
                                const kingdomIndex = this.voronoiTerrain.kingdoms.indexOf(planet.county.duchy.kingdom);
                                const physicsShard = Array.from(this.shardList.values()).find(s => s.type === EServerType.PHYSICS_NODE && s.kingdomIndex === kingdomIndex);
                                const investAmountMessage: IInvestDepositShardMessage = {
                                    shardMessageType: EShardMessageType.INVEST_DEPOSIT_AMOUNT,
                                    amount,
                                    planetId,
                                    playerId: player.id
                                };
                                this.outgoingShardMessages.push([physicsShard.name, investAmountMessage]);
                            }
                        }
                    } else if (message.messageType === EMessageType.INVEST_WITHDRAWAL) {
                        const investMessage = message as IInvestWithdrawalMessage;
                        const {
                            amount,
                            planetId
                        } = investMessage;
                        const planet = this.planets.get(planetId);

                        const player = this.playerData.get(playerId);
                        if (!player) {
                            continue;
                        }

                        const payment = {currencyId: "GOLD", amount};
                        if (planet && player) {
                            if ([EServerType.STANDALONE].includes(this.serverType)) {
                                planet.withdrawInvestment(playerId, player.moneyAccount, payment);
                            } else if ([EServerType.AI_NODE].includes(this.serverType)) {
                                const kingdomIndex = this.voronoiTerrain.kingdoms.indexOf(planet.county.duchy.kingdom);
                                const physicsShard = Array.from(this.shardList.values()).find(s => s.type === EServerType.PHYSICS_NODE && s.kingdomIndex === kingdomIndex);
                                const investAmountMessage: IInvestWithdrawShardMessage = {
                                    shardMessageType: EShardMessageType.INVEST_WITHDRAW_AMOUNT,
                                    amount,
                                    planetId,
                                    playerId: player.id
                                };
                                this.outgoingShardMessages.push([physicsShard.name, investAmountMessage]);
                            }
                        }
                    } if (message.messageType === EMessageType.AUTOPILOT) {
                        const autoPilotMessage = message as IAutoPilotMessage;

                        const player = this.playerData.get(playerId);
                        if (!player) {
                            continue;
                        }

                        if (player) {
                            player.autoPilotEnabled = autoPilotMessage.enabled;
                        }
                    } else if (message.messageType === EMessageType.SHIP_STATE) {
                        const shipStateMessage = message as IShipStateMessage;

                        const player = this.playerData.get(playerId);
                        if (!player) {
                            continue;
                        }

                        if (player && !player.autoPilotEnabled) {
                            const ship = this.ships.get(player.shipId);
                            if (ship) {
                                if ([EServerType.STANDALONE].includes(this.serverType)) {
                                    // update ship position
                                    ship.position = DeserializeQuaternion(shipStateMessage.position);
                                    ship.positionVelocity = DeserializeQuaternion(shipStateMessage.positionVelocity);
                                    ship.orientation = DeserializeQuaternion(shipStateMessage.orientation);
                                    ship.orientationVelocity = DeserializeQuaternion(shipStateMessage.orientationVelocity);

                                    // add new cannonballs
                                    shipStateMessage.newCannonBalls.map(c => CannonBall.deserialize(c)).forEach(c => {
                                        this.cannonBalls.set(c.id, c);
                                    });
                                } else if ([EServerType.AI_NODE].includes(this.serverType)) {
                                    const planet = this.voronoiTerrain.getNearestPlanet(ship.position.rotateVector([0, 0, 1]));
                                    const kingdomIndex = planet.county.duchy.kingdom.terrain.kingdoms.indexOf(planet.county.duchy.kingdom);
                                    const kingdomPhysicsNode = Array.from(this.shardList.values()).find(p => p.type === EServerType.PHYSICS_NODE && p.kingdomIndex === kingdomIndex);
                                    const shipStateShardMessage: IShipStateShardMessage = {
                                        shardMessageType: EShardMessageType.SHIP_STATE,
                                        playerId: player.id,
                                        position: shipStateMessage.position,
                                        positionVelocity: shipStateMessage.positionVelocity,
                                        orientation: shipStateMessage.orientation,
                                        orientationVelocity: shipStateMessage.orientationVelocity,
                                        newCannonBalls: shipStateMessage.newCannonBalls
                                    };
                                    this.outgoingShardMessages.push([kingdomPhysicsNode.name, shipStateShardMessage]);
                                }
                            }
                        }
                    } else if (message.messageType === EMessageType.CLAIM_PLANET) {
                        const {
                            planetId,
                            factionId
                        } = message as IClaimPlanetMessage;
                        const planet = this.planets.get(planetId);
                        if (!planetId) {
                            return;
                        }

                        const faction = this.factions.get(factionId);
                        if (!faction) {
                            return;
                        }

                        planet.claim(faction, false, null);
                    }
                } else {
                    // no more messages, continue
                    break;
                }
            }
        } else if ([EServerType.LOAD_BALANCER].includes(this.serverType)) {
            while (true) {
                const item = this.incomingMessages.shift();
                if (item) {
                    const [playerId, message] = item;
                    switch (message.messageType) {
                        case EMessageType.JOIN: {
                            // forward message to the best AI node
                            const bestShardCount = Array.from(this.aiShardCount.values()).sort((a, b) => a.players.length - b.players.length)[0];
                            const aiShard = this.shardList.get(bestShardCount.name);
                            bestShardCount.numAI += 1;
                            bestShardCount.players.push(playerId);
                            const joinAliasMessage: IJoinAliasShardMessage = {
                                shardMessageType: EShardMessageType.JOIN_ALIAS,
                                playerId,
                                name: (message as IJoinMessage).name,
                            };
                            this.outgoingShardMessages.push([aiShard.name, joinAliasMessage]);

                            const joinResultMessage: IJoinResultMessage = {
                                messageType: EMessageType.JOIN_RESULT,
                                shardName: aiShard.name
                            };
                            this.outgoingMessages.push([playerId, joinResultMessage]);
                            break;
                        }
                    }
                } else {
                    break;
                }
            }
        }

        // DONE - should be converted into SHARD FORMAT
        // handle physics and sharded data per server instance
        // PHYSIC === Truth, will send info back to AI and Global, PHYSICS -> AI
        // handle trade routes and physics
        // the core physics of the game, will update the AI with the latest physics, for rendering in browser
        // cannonballs and crates go here
        // - Physics send cannonballs
        // - Physics send crates
        if ([EServerType.STANDALONE, EServerType.PHYSICS_NODE].includes(this.serverType)) {
            if (this.isTradeTick()) {
                Market.ComputeProfitableTradeDirectedGraph(this);
            }
        }
        if ([EServerType.STANDALONE, EServerType.PHYSICS_NODE].includes(this.serverType)) {
            // expire cannonballs and crates
            const expirableArrays: Array<{
                array: Map<string, IExpirableTicks>,
                removeFromDataStructures: (item: IExpirableTicks) => void,
            }> = [{
                array: this.cannonBalls,
                removeFromDataStructures(this: Game, item: CannonBall) {
                    this.voronoiTerrain.removeCannonBall(item);
                }
            }, {
                array: this.crates,
                removeFromDataStructures(this: Game, item: Crate) {
                    this.voronoiTerrain.removeCrate(item);
                }
            }];
            for (const {array: expirableArray, removeFromDataStructures} of expirableArrays) {

                // collect expired entities
                const expiredEntities: [string, IExpirableTicks][] = [];
                for (const [id,entity] of expirableArray) {
                    const isExpired = entity.life >= entity.maxLife;
                    if (isExpired) {
                        expiredEntities.push([id, entity]);
                    }
                }

                // remove expired entities
                for (const [id, entity] of expiredEntities) {
                    if (expirableArray.has(id)) {
                        expirableArray.delete(id);
                        removeFromDataStructures.call(this, entity);
                    }
                }
            }

            // move cannonballs and crates
            const movableArrays: Array<Map<string, ICameraState & IExpirableTicks>> = [
                this.cannonBalls,
                this.crates
            ];
            for (const movableArray of movableArrays) {
                for (const [, entity] of movableArray) {
                    entity.position = entity.position.clone().mul(entity.positionVelocity.clone());
                    entity.orientation = entity.orientation.clone().mul(entity.orientationVelocity.clone());
                    entity.life += 1;
                }
            }

            // handle physics and collision detection
            const collidableArrays: Array<{
                arr: Map<string, ICollidable>,
                collideFn: (this: Game, ship: Ship, entity: ICollidable, hit: IHitTest) => void,
                useRayCast: boolean,
                removeFromDataStructures: (item: IExpirableTicks) => void,
            }> = [{
                arr: this.cannonBalls,
                collideFn(this: Game, ship: Ship, entity: ICollidable, hit: IHitTest) {
                    ship.applyDamage(entity as CannonBall);
                },
                useRayCast: true,
                removeFromDataStructures(this: Game, item: CannonBall) {
                    this.voronoiTerrain.removeCannonBall(item);
                }
            }, {
                arr: this.crates,
                collideFn(this: Game, ship: Ship, entity: ICollidable, hit: IHitTest) {
                    ship.pickUpCargo(entity as Crate);
                },
                useRayCast: false,
                removeFromDataStructures(this: Game, item: Crate) {
                    this.voronoiTerrain.removeCrate(item);
                }
            }];
            for (const {arr: collidableArray, collideFn, useRayCast, removeFromDataStructures} of collidableArrays) {
                const entitiesToRemove: [string, ICollidable][] = [];
                for (const [id, entity] of collidableArray) {
                    // get nearby ships
                    const position = entity.position.rotateVector([0, 0, 1]);
                    const nearByShips = Array.from(this.voronoiShips.listItems(position));

                    // compute the closest ship
                    let bestHit: IHitTest | null = null;
                    let bestShip: Ship | null = null;
                    for (const nearByShip of nearByShips) {
                        if (useRayCast) {
                            const hit = Game.cannonBallCollision(entity, nearByShip, this.worldScale);
                            if (hit.success && hit.time && (!bestHit || (bestHit && bestHit.time && hit.time < bestHit.time))) {
                                bestHit = hit;
                                bestShip = nearByShip;
                            }
                        } else {
                            const point = nearByShip.position.rotateVector([0, 0, 1]);
                            const distance = VoronoiGraph.angularDistance(
                                point,
                                position,
                                this.worldScale
                            );
                            if (distance < PHYSICS_SCALE * (entity.size || 1) && (!bestHit || (bestHit && bestHit.distance && distance < bestHit.distance))) {
                                bestHit = {
                                    success: true,
                                    distance,
                                    time: 0,
                                    point
                                };
                                bestShip = nearByShip;
                            }
                        }
                    }

                    // apply damage
                    const teamDamage = bestShip && bestShip.faction && entity.factionId && bestShip.faction.id === entity.factionId;
                    if (bestHit && bestShip && !teamDamage) {
                        collideFn.call(this, bestShip, entity, bestHit);
                        entitiesToRemove.push([id, entity]);
                    }
                }
                // remove collided cannonballs
                for (const [id, entity] of entitiesToRemove) {
                    if (collidableArray.has(id)) {
                        collidableArray.delete(id);
                        removeFromDataStructures.call(this, entity);
                    }
                }
            }
        }

        // DONE - should be converted into SHARD FORMAT
        // update collision acceleration structures
        // required by AI and PHYSICS
        if ([EServerType.STANDALONE, EServerType.PHYSICS_NODE, EServerType.AI_NODE].includes(this.serverType)) {
            for (const [, ship] of this.ships) {
                this.voronoiShips.removeItem(ship);
            }
        }

        // DONE - should be converted into SHARD FORMAT
        // handle AI, must send messages back to physics since physics is the source of truth
        // handle AI movement, ship movement and orders
        // - Physics send ship health updates
        // - AI send destroy message
        // - AI send new orders
        // - Physics Performs Ship Movement
        // - AI sends playerData
        if ([EServerType.STANDALONE, EServerType.PHYSICS_NODE, EServerType.AI_NODE].includes(this.serverType)) {
            // AI ship loop
            const destroyedShips: Ship[] = [];
            for (const [shipId, ship] of this.ships) {
                // skip ships which are not controlled by the shard
                if ([EServerType.PHYSICS_NODE].includes(this.serverType)) {
                    const planet = this.voronoiTerrain.getNearestPlanet(ship.position.rotateVector([0, 0, 1]));
                    const kingdomIndex = planet.county.duchy.kingdom.terrain.kingdoms.indexOf(planet.county.duchy.kingdom);
                    if (kingdomIndex !== this.physicsKingdomIndex) {
                        continue;
                    }
                }
                if ([EServerType.AI_NODE].includes(this.serverType)) {
                    const isMonitored = this.monitoredShips.has(shipId);
                    if (!isMonitored) {
                        continue;
                    }
                }

                // handle ship health
                if ([EServerType.STANDALONE, EServerType.PHYSICS_NODE].includes(this.serverType)) {
                    if (ship.health <= 0) {
                        destroyedShips.push(ship);
                        const crates = ship.destroy();
                        for (const crate of crates) {
                            this.crates.set(crate.id, crate);
                        }
                        continue;
                    }
                }

                // handle ship orders
                // handle automatic piracy orders
                if ([EServerType.STANDALONE, EServerType.AI_NODE].includes(this.serverType)) {
                    const hasPiracyOrder: boolean = ship.hasPirateOrder();
                    const hasPirateCargo: boolean = ship.hasPirateCargo();
                    if (!hasPiracyOrder && hasPirateCargo && ship.faction) {
                        const piracyOrder = new Order(this, ship, ship.faction);
                        piracyOrder.orderType = EOrderType.PIRATE;
                        ship.orders.splice(0, 0, piracyOrder);
                    }
                    // get new orders from faction
                    if (ship.orders.length === 0) {
                        if (ship.planet) {
                            if ([EServerType.STANDALONE].includes(this.serverType)) {
                                ship.orders.push(ship.planet.getOrder(ship));
                            } else if ([EServerType.AI_NODE].includes(this.serverType) && !this.fetchingOrder.has(ship.id)) {
                                // note that the AI node needs to remember this message was sent due to network lag
                                this.fetchingOrder.add(ship.id);
                                const fetchOrderMessage: IFetchOrderShardMessage = {
                                    shardMessageType: EShardMessageType.FETCH_ORDER,
                                    shipId: ship.id
                                };
                                const kingdomIndex = ship.planet.county.duchy.kingdom.terrain.kingdoms.indexOf(ship.planet.county.duchy.kingdom);
                                const physicsNode = Array.from(this.shardList.values()).find(s => s.type === EServerType.PHYSICS_NODE && s.kingdomIndex === kingdomIndex);
                                this.outgoingShardMessages.push([physicsNode.name, fetchOrderMessage]);
                            }
                        }
                    }
                }
                if ([EServerType.STANDALONE, EServerType.AI_NODE].includes(this.serverType)) {
                    // handle first priority order
                    const shipOrder = ship.orders[0];
                    if (shipOrder) {
                        shipOrder.handleOrderLoop();
                    }
                }

                if ([EServerType.STANDALONE, EServerType.AI_NODE].includes(this.serverType)) {
                    if (ship.fireControl.targetShipId) {
                        // handle firing at ships
                        ship.fireControl.fireControlLoop();
                    }
                    // handle pathfinding
                    ship.pathFinding.pathFindingLoop(ship.fireControl.isAttacking);
                }

                if ([EServerType.STANDALONE, EServerType.PHYSICS_NODE].includes(this.serverType)) {
                    const playerData = Array.from(this.playerData.values()).find(p => p.shipId === ship.id);
                    if (playerData && !playerData.autoPilotEnabled) {
                        // ship is player ship which has no autopilot, accept player control
                        this.handleShipLoop(shipId, () => {
                            if (playerData.filterActiveKeys) {
                                return playerData.activeKeys.filter(x => playerData.filterActiveKeys.includes(x));
                            } else {
                                return playerData.activeKeys;
                            }
                        }, false);
                    } else {
                        // ship is npc ship if autoPilot is not enabled
                        this.handleShipLoop(shipId, () => ship.activeKeys, true);
                    }
                }
            }

            // remove destroyed ships
            if ([EServerType.STANDALONE, EServerType.PHYSICS_NODE].includes(this.serverType)) {
                for (const destroyedShip of destroyedShips) {
                    const player = Array.from(this.playerData.values()).find(p => p.shipId === destroyedShip.id);
                    if (player) {
                        if ([EServerType.STANDALONE].includes(this.serverType)) {
                            player.shipId = "";
                            const message: IDeathMessage = {
                                messageType: EMessageType.DEATH
                            };
                            this.outgoingMessages.push([player.id, message]);
                        } else if ([EServerType.PHYSICS_NODE].includes(this.serverType)) {
                            const aiNodeName = player.aiNodeName;
                            const message: IDeathShardMessage = {
                                shardMessageType: EShardMessageType.DEATH,
                                playerId: player.id
                            };
                            this.outgoingShardMessages.push([aiNodeName, message]);
                        }
                    }
                    if (this.ships.has(destroyedShip.id)) {
                        this.ships.delete(destroyedShip.id);
                        this.voronoiTerrain.removeShip(destroyedShip);
                    }
                }
            }
        }

        // DONE - should be converted into SHARD FORMAT
        // update collision acceleration structures
        // used by PHYSICS for collision
        // used by AI for speeding up orders
        if ([EServerType.STANDALONE, EServerType.PHYSICS_NODE, EServerType.AI_NODE].includes(this.serverType)) {
            for (const [, ship] of this.ships) {
                this.voronoiShips.addItem(ship);
            }
            for (const [, ship] of this.ships) {
                this.voronoiTerrain.updateShip(ship);
            }
            for (const [, cannonBall] of this.cannonBalls) {
                this.voronoiTerrain.updateCannonBall(cannonBall);
            }
            for (const [, crate] of this.crates) {
                this.voronoiTerrain.updateCrate(crate);
            }
        }

        // DONE - should be converted into SHARD FORMAT
        // AI will send order updates to physics
        // - send order updates to PHYSICS
        // AI -> PHYSICS
        if ([EServerType.STANDALONE, EServerType.AI_NODE].includes(this.serverType)) {
            for (const [, ship] of this.ships) {
                // handle detecting ships to shoot at
                if (!ship.fireControl.targetShipId && !ship.fireControl.retargetCoolDown) {
                    // get a list of nearby ships
                    const shipPosition = ship.position.clone().rotateVector([0, 0, 1]);
                    const nearByShips = Array.from(this.voronoiShips.listItems(shipPosition));
                    const nearByEnemyShips: Ship[] = [];
                    const nearByFriendlyShips: Ship[] = [];
                    for (const nearByShip of nearByShips) {
                        if (VoronoiGraph.angularDistance(
                            nearByShip.position.clone().rotateVector([0, 0, 1]),
                            shipPosition,
                            this.worldScale
                        ) < Game.PROJECTILE_DETECTION_RANGE) {
                            if (!(nearByShip.faction && ship.faction && nearByShip.faction.id === ship.faction.id)) {
                                nearByEnemyShips.push(nearByShip);
                            } else {
                                nearByFriendlyShips.push(nearByShip);
                            }
                        }
                    }

                    // find the closest target
                    let closestTarget: Ship | null = null;
                    let closestDistance: number | null = null;
                    // also count the number of cannons
                    let numEnemyCannons: number = 0;
                    let numFriendlyCannons: number = 0;
                    for (const nearByEnemyShip of nearByEnemyShips) {
                        const distance = VoronoiGraph.angularDistance(
                            shipPosition,
                            nearByEnemyShip.position.clone().rotateVector([0, 0, 1]),
                            this.worldScale
                        );

                        const coneHit = ship.fireControl.getConeHit(nearByEnemyShip);
                        if (!(coneHit.success && coneHit.point && coneHit.time && coneHit.time < Game.PROJECTILE_LIFE)) {
                            // target is moving too fast, cannot hit it
                            continue;
                        }

                        if (!closestDistance || distance < closestDistance) {
                            closestDistance = distance;
                            closestTarget = nearByEnemyShip;
                        }

                        const shipData = GetShipData(nearByEnemyShip.shipType, this.shipScale);
                        if (!shipData) {
                            throw new Error("Could not find ship type");
                        }
                        numEnemyCannons += shipData.cannons.numCannons;
                    }
                    for (const nearByFriendlyShip of nearByFriendlyShips) {
                        const shipData = GetShipData(nearByFriendlyShip.shipType, this.shipScale);
                        if (!shipData) {
                            throw new Error("Could not find ship type");
                        }
                        numFriendlyCannons += shipData.cannons.numCannons;
                    }

                    // set the closest target
                    if (closestTarget) {
                        ship.fireControl.targetShipId = closestTarget.id;
                        if (!this.demoAttackingShipId || +this.lastDemoAttackingShipTime + 30 * 1000 < +new Date()) {
                            this.demoAttackingShipId = ship.id;
                            this.lastDemoAttackingShipTime = new Date();
                        }
                    }

                    // if too many ships, cancel order and stop attacking
                    const currentShipData = GetShipData(ship.shipType, this.shipScale);
                    if (!currentShipData) {
                        throw new Error("Could not find ship type");
                    }
                    if (numEnemyCannons > (numFriendlyCannons + currentShipData.cannons.numCannons) * 1.5 && ship.hasPirateOrder()) {
                        for (const order of ship.orders) {
                            order.cancelOrder(numEnemyCannons);
                            ship.fireControl.isAttacking = false;
                        }
                    }
                }
            }
        }

        // DONE - should be converted into SHARD FORMAT
        // handle local shard state, this is physics node
        // - send plant update to AI and GLOBAL STATE
        if ([EServerType.STANDALONE, EServerType.PHYSICS_NODE].includes(this.serverType)) {
            // handle planet loop
            for (const [, planet] of this.planets) {
                if ([EServerType.PHYSICS_NODE].includes(this.serverType)) {
                    const kingdomIndex = planet.county.duchy.kingdom.terrain.kingdoms.indexOf(planet.county.duchy.kingdom);
                    if (this.physicsKingdomIndex !== kingdomIndex) {
                        continue;
                    }
                }
                planet.handlePlanetLoop();
            }
        }
        if ([EServerType.STANDALONE, EServerType.GLOBAL_STATE_NODE].includes(this.serverType)) {
            // handle AI invasions
            for (const invasion of Array.from(this.invasions.values())) {
                invasion.handleInvasionLoop();
            }

            // handle AI factions
            for (const faction of Array.from(this.factions.values())) {
                faction.handleFactionLoop();
            }

            // handle player scores
            const scoreMoneyAccount = (playerData: IPlayerData): IScoreBoardMoneyItem => {
                let amount = 0;
                for (const currency of playerData.moneyAccount.currencies) {
                    if (currency.currencyId === "GOLD") {
                        amount += currency.amount;
                    }
                }

                return {
                    playerId: playerData.id,
                    name: playerData.name,
                    amount
                };
            };
            this.scoreBoard.money = Array.from(this.playerData.values()).map(scoreMoneyAccount);
            for (const [, planet] of this.planets) {
                for (const moneyScore of this.scoreBoard.money) {
                    const investmentAccount = planet.investmentAccounts.get(moneyScore.playerId);
                    if (investmentAccount) {
                        moneyScore.amount += investmentAccount.lots.reduce((acc, lot) => acc + (lot.ticksRemaining === 0 ? lot.matureAmount : lot.amount), 0);
                    }
                }
            }
            this.scoreBoard.money = this.scoreBoard.money.sort((a, b) => b.amount - a.amount);

            // sort land ownership
            this.scoreBoard.land = Array.from(this.factions.values()).reduce((acc, i) => {
                acc.push(...i.factionPlayerRoyalTitles.counts.reduce((acc2, j) => {
                    const oldItem = acc2.find(k => k.playerId === j.playerId);
                    // county titles are one point
                    if (oldItem) {
                        oldItem.amount += 1;
                    } else {
                        acc2.push({
                            playerId: j.playerId,
                            name: this.playerData.get(j.playerId)?.name ?? j.playerId,
                            amount: 1,
                        });
                    }
                    return acc2;
                }, [] as IScoreBoardLandItem[]).map((j) => {
                    // baron titles are two points
                    j.amount += i.factionPlayerRoyalTitles.barons.filter(k => k.playerId === j.playerId).length * 2;
                    return j;
                }).map((j) => {
                    // duke titles are three points
                    j.amount += i.factionPlayerRoyalTitles.dukes.filter(k => k.playerId === j.playerId).length * 3;
                    return j;
                }).map((j) => {
                    // arch duke titles are four points
                    j.amount += i.factionPlayerRoyalTitles.archDukes.filter(k => k.playerId === j.playerId).length * 4;
                    return j;
                }).map((j) => {
                    // king titles are five points
                    j.amount += i.factionPlayerRoyalTitles.kings.filter(k => k.playerId === j.playerId).length * 5;
                    return j;
                }).map((j) => {
                    // emperor titles are six points
                    j.amount += i.factionPlayerRoyalTitles.emperors.filter(k => k.playerId === j.playerId).length * 6;
                    return j;
                }));
                return acc;
            }, [] as IScoreBoardLandItem[]);
            this.scoreBoard.land.sort(((a, b) => b.amount - a.amount));
        }

        this.handleServerScriptEvents();

        this.handleServerShardPostLoop();
    }

    /**
     * --------------------------------------------------------------------------
     * Client Loop
     * --------------------------------------------------------------------------
     */

    private static MAX_TESSELLATION: number = 3;

    private static randomRange(start: number = -1, end: number = 1): number {
        const value = Math.random();
        return start + (end - start) * value;
    }

    public rotateDelaunayTriangle(camera: ICameraState, earthLike: boolean, triangle: ICellData, index: number): IDrawableTile {
        const {
            position: cameraPosition,
            orientation: cameraOrientation,
        } = camera;
        const pointToQuaternion = (v: [number, number, number]): Quaternion => {
            const q = Quaternion.fromBetweenVectors([0, 0, 1], v);
            return cameraOrientation.clone().inverse()
                .mul(cameraPosition.clone().inverse())
                .mul(q);
        };
        const vertices = triangle.vertices.map(pointToQuaternion);
        let color: string = "red";
        if (earthLike) {
            // earth colors
            if (index % 6 < 2) {
                color = "green";
            } else {
                color = "blue";
            }
        } else {
            // beach ball colors
            if (index % 6 === 0) {
                color = "red";
            } else if (index % 6 === 1) {
                color = "orange";
            } else if (index % 6 === 2) {
                color = "yellow";
            } else if (index % 6 === 3) {
                color = "green";
            } else if (index % 6 === 4) {
                color = "blue";
            } else if (index % 6 === 5) {
                color = "purple";
            }
        }

        const tile = new DelaunayTile();
        tile.vertices = vertices;
        tile.centroid = pointToQuaternion(triangle.centroid);
        tile.color = color;
        tile.id = `tile-${index}`;
        return tile;
    }

    public* getDelaunayTileTessellation(centroid: Quaternion, vertices: Quaternion[], maxStep: number = Game.MAX_TESSELLATION, step: number = 0): Generator<ITessellatedTriangle> {
        if (step === maxStep) {
            // max step, return current level of tessellation
            const data: ITessellatedTriangle = {
                vertices,
            };
            return yield data;
        } else if (step === 0) {
            // perform triangle fan
            for (let i = 0; i < vertices.length; i++) {
                const generator = this.getDelaunayTileTessellation(centroid, [
                    centroid,
                    vertices[i % vertices.length],
                    vertices[(i + 1) % vertices.length],
                ], maxStep, step + 1);
                while (true) {
                    const res = generator.next();
                    if (res.done) {
                        break;
                    }
                    yield res.value;
                }
            }

        } else {
            // perform triangle tessellation

            // compute mid-points used in tessellation
            const midPoints: Quaternion[] = [];
            for (let i = 0; i < vertices.length; i++) {
                const a: Quaternion = vertices[i % vertices.length].clone();
                const b: Quaternion = vertices[(i + 1) % vertices.length].clone();
                let lerpPoint = Game.lerp(
                    a.rotateVector([0, 0, 1]),
                    b.rotateVector([0, 0, 1]),
                    0.5
                )
                if (DelaunayGraph.distanceFormula(lerpPoint, [0, 0, 0]) < 0.01) {
                    lerpPoint = Game.lerp(
                        a.rotateVector([0, 0, 1]),
                        b.rotateVector([0, 0, 1]),
                        0.4
                    );
                }
                const midPoint = Quaternion.fromBetweenVectors(
                    [0, 0, 1],
                    DelaunayGraph.normalize(lerpPoint)
                );
                midPoints.push(midPoint);
            }

            // return recursive tessellation of triangle into 4 triangles
            const generators: Array<Generator<ITessellatedTriangle>> = [
                this.getDelaunayTileTessellation(centroid, [
                    vertices[0],
                    midPoints[0],
                    midPoints[2]
                ], maxStep, step + 1),
                this.getDelaunayTileTessellation(centroid, [
                    vertices[1],
                    midPoints[1],
                    midPoints[0]
                ], maxStep, step + 1),
                this.getDelaunayTileTessellation(centroid, [
                    vertices[2],
                    midPoints[2],
                    midPoints[1]
                ], maxStep, step + 1),
                this.getDelaunayTileTessellation(centroid, [
                    midPoints[0],
                    midPoints[1],
                    midPoints[2]
                ], maxStep, step + 1)
            ];
            for (const generator of generators) {
                while (true) {
                    const res = generator.next();
                    if (res.done) {
                        break;
                    }
                    yield res.value;
                }
            }
        }
    }

    public static lerp(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
        const delta = DelaunayGraph.subtract(b, a);
        return [
            a[0] + delta[0] * t,
            a[1] + delta[1] * t,
            a[2] + delta[2] * t
        ];
    }

    /**
     * Initialize random position and orientation for an entity.
     * @param entity The entity to add random position and orientation to.
     * @private
     */
    public static addRandomPositionAndOrientationToEntity(entity: ICameraState) {
        entity.position = new Quaternion(0, Game.randomRange(), Game.randomRange(), Game.randomRange());
        entity.position = entity.position.normalize();
        entity.orientation = Quaternion.fromAxisAngle([0, 0, 1], Math.random() * 2 * Math.PI);
    }

    public generateGoodPoints<T extends ICameraState>(numPoints: number, numSteps: number): VoronoiCell[] {
        if (numPoints < 4) {
            throw new Error("Not enough points to initialize sphere");
        }
        let delaunayGraph = new DelaunayGraph<T>(this);
        let voronoiGraph = new VoronoiGraph<T>(this);
        delaunayGraph.initialize();
        for (let i = 0; i < numPoints - 4; i++) {
            delaunayGraph.incrementalInsert();
        }
        for (let step = 0; step < numSteps; step++) {
            // this line is needed because inserting vertices could remove old vertices.
            if (delaunayGraph.triangles.length <= 0) {
                delaunayGraph = new DelaunayGraph<T>(this);
                delaunayGraph.initialize();
            }
            while (delaunayGraph.numRealVertices() < numPoints) {
                delaunayGraph.incrementalInsert();
            }
            voronoiGraph = delaunayGraph.getVoronoiGraph();
            const lloydPoints = voronoiGraph.lloydRelaxation();
            delaunayGraph = new DelaunayGraph<T>(this);
            delaunayGraph.initializeWithPoints(lloydPoints);
        }
        // this line is needed because inserting vertices could remove old vertices.
        if (delaunayGraph.triangles.length <= 0) {
            delaunayGraph = new DelaunayGraph<T>(this);
            delaunayGraph.initialize();
        }
        while (delaunayGraph.numRealVertices() < numPoints) {
            delaunayGraph.incrementalInsert();
        }
        voronoiGraph = delaunayGraph.getVoronoiGraph();
        return voronoiGraph.cells;
    }

    public generateTessellatedPoints<T extends ICameraState>(tessellationLevel: number, numSteps: number): VoronoiCell[] {
        let delaunayGraph = new DelaunayGraph<T>(this);
        let voronoiGraph = new VoronoiGraph<T>(this);
        delaunayGraph.initialize();

        // generate tessellated points to a tessellation level
        const tessellatedPoints = Array.from(delaunayGraph.GetTriangles())
            .map(this.rotateDelaunayTriangle.bind(this, this.getPlayerShip(), false) as (value: DelaunayTriangle, index: number) => IDrawableTile)
            .reduce((acc, tile) => {
                const tessellatedTriangles = Array.from(this.getDelaunayTileTessellation(tile.centroid, tile.vertices, tessellationLevel, 1));
                return [
                    ...acc,
                    ...tessellatedTriangles.map(t => {
                        return DelaunayGraph.normalize(
                            Game.getAveragePoint(t.vertices.map(v => v.rotateVector([0, 0, 1])))
                        );
                    })
                ];
            }, [] as Array<[number, number, number]>);
        const jitteredTessellatedPoints = tessellatedPoints.map(t => {
            const jitter = DelaunayGraph.randomPoint();
            const jitterAmount = 0;
            return DelaunayGraph.normalize([
                t[0] + jitter[0] * jitterAmount,
                t[1] + jitter[1] * jitterAmount,
                t[2] + jitter[2] * jitterAmount
            ]);
        });

        // add jittered tessellated points
        for (const point of jitteredTessellatedPoints) {
            delaunayGraph.incrementalInsert(point);
        }

        for (let step = 0; step < numSteps; step++) {
            // this line is needed because inserting vertices could remove old vertices.
            while (delaunayGraph.numRealVertices() < Math.pow(4, tessellationLevel) + 4) {
                delaunayGraph.incrementalInsert();
            }
            voronoiGraph = delaunayGraph.getVoronoiGraph();
            const lloydPoints = voronoiGraph.lloydRelaxation();
            delaunayGraph = new DelaunayGraph<T>(this);
            delaunayGraph.initializeWithPoints(lloydPoints);
        }
        // this line is needed because inserting vertices could remove old vertices.
        while (delaunayGraph.numRealVertices() < Math.pow(4, tessellationLevel) + 4) {
            delaunayGraph.incrementalInsert();
        }
        voronoiGraph = delaunayGraph.getVoronoiGraph();
        return voronoiGraph.cells;
    }

    public buildStar(point: [number, number, number], index: number): Star {
        const star = new Star(this);
        star.id = `star-${index}`;
        star.position = Quaternion.fromBetweenVectors([0, 0, 1], point);
        if (index % 5 === 0 || index % 5 === 1) {
            star.color = "blue";
            star.size = 5;
        } else if (index % 5 === 2 || index % 5 === 3) {
            star.color = "yellow";
            star.size = 2.5;
        } else if (index % 5 === 4) {
            star.color = "red";
            star.size = 7.5;
        }
        return star;
    }

    public lerpColors(a: string, b: string, t: number): string {
        const v1: number[] = [
            parseInt(a.slice(1, 3), 16),
            parseInt(a.slice(3, 5), 16),
            parseInt(a.slice(5, 7), 16)
        ];
        const v2: number[] = [
            parseInt(b.slice(1, 3), 16),
            parseInt(b.slice(3, 5), 16),
            parseInt(b.slice(5, 7), 16)
        ];
        const v3 = [
            Math.floor(v1[0] * (1 - t) + v2[0] * t),
            Math.floor(v1[1] * (1 - t) + v2[1] * t),
            Math.floor(v1[2] * (1 - t) + v2[2] * t)
        ];
        const v4 = [v3[0].toString(16), v3[1].toString(16), v3[2].toString(16)];
        return `#${v4[0].length === 2 ? v4[0] : `0${v4[0]}`}${v4[1].length === 2 ? v4[1] : `0${v4[1]}`}${v4[2].length === 2 ? v4[2] : `0${v4[2]}`}`;
    }

    /**
     * Create a planet.
     * @param planetPoint The point the planet is created at.
     * @param county The feudal county of the planet.
     * @param planetI The index of the planet.
     * @private
     */
    public createPlanet(planetPoint: [number, number, number], county: VoronoiCounty, planetI: number): Planet {
        const planet = new Planet(this, county);
        planet.id = `planet-${planetI}`;
        planet.position = Quaternion.fromBetweenVectors([0, 0, 1], planetPoint);
        planet.position = planet.position.normalize();
        planet.orientation = Quaternion.fromAxisAngle([0, 0, 1], Math.random() * 2 * Math.PI);
        const colorValue = Math.random();
        if (colorValue > 0.875)
            planet.color = this.lerpColors(planet.county.duchy.color, "#ff8888", 0.33);
        else if (colorValue > 0.75)
            planet.color = this.lerpColors(planet.county.duchy.color, "#88ff88", 0.33);
        else if (colorValue > 0.625)
            planet.color = this.lerpColors(planet.county.duchy.color, "#8888ff", 0.33);
        else if (colorValue > 0.5)
            planet.color = this.lerpColors(planet.county.duchy.color, "#ffff88", 0.33);
        else if (colorValue > 0.375)
            planet.color = this.lerpColors(planet.county.duchy.color, "#88ffff", 0.33);
        else if (colorValue > 0.25)
            planet.color = this.lerpColors(planet.county.duchy.color, "#ff88ff", 0.33);
        else if (colorValue > 0.125)
            planet.color = this.lerpColors(planet.county.duchy.color, "#ffffff", 0.33);
        else
            planet.color = this.lerpColors(planet.county.duchy.color, "#888888", 0.33);
        planet.buildInitialResourceBuildings();
        planet.recomputeResources();

        // create pathing node
        const position = planet.position.rotateVector([0, 0, 1]);
        const pathingNode = new PathingNode<any>(this);
        pathingNode.id = planetI;
        pathingNode.instance = this;
        pathingNode.position = position;

        planet.pathingNode = pathingNode;
        return planet;
    }

    public startInvasion(planetId: string, defending: Faction, attacking: Faction) {
        if (!this.invasions.has(planetId)) {
            const invasion = new Invasion(this, attacking, defending, planetId);
            this.invasions.set(planetId, invasion);
        }
    }

    public getFormsForPlayer(playerData: IPlayerData): IFormResult {
        const playerId = playerData.id;
        const cards: IFormCard[] = [];

        if (this.formEmitters.has(playerId)) {
            for (const formEmitter of [...this.formEmitters.get(playerId)!]) {
                switch (formEmitter.type) {
                    case EFormEmitterType.PLANET: {
                        const planet = this.planets.get(formEmitter.id);
                        if (planet) {
                            cards.push(...planet.getTradeScreenForPlayer(playerId));
                        }
                        break;
                    }
                    case EFormEmitterType.INVASION: {
                        const invasion = this.invasions.get(formEmitter.id);
                        if (invasion) {
                            cards.push(...invasion.getInvasionResultForPlayer(playerId));
                        } else {
                            const index = this.formEmitters.get(playerId)!.indexOf(formEmitter);
                            if (index >= 0) {
                                this.formEmitters.get(playerId)!.splice(index, 1);
                            }
                        }
                    }
                }
            }
        }

        return {
            cards
        };
    }

    public handleFormApiRequestForPlayer(playerData: IPlayerData, request: IFormRequest): void {
        const playerId = playerData.id;

        if (this.formEmitters.has(playerId)) {
            for (const formEmitter of this.formEmitters.get(playerId)!) {
                switch (formEmitter.type) {
                    case EFormEmitterType.PLANET: {
                        const planet = this.planets.get(formEmitter.id);
                        if (planet) {
                            planet.handleTradeScreenRequestsForPlayer(playerId, request);
                        }
                        break;
                    }
                }
            }
        }
    }
}