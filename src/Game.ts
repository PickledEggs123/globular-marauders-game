/**
 * The direction of the market trade node/edge.
 */
import {ISerializedPlanet, ISerializedPlanetFull, Market, Planet, Star} from "./Planet";
import {
    EServerType,
    EShardMessageType,
    IAIPlayerDataStateShardMessage,
    IAiShardCountItem,
    ICameraState,
    ICollidable,
    IDeathShardMessage,
    IDirectedMarketTrade,
    IExpirableTicks,
    IFetchOrderResultShardMessage,
    IFetchOrderShardMessage,
    IGlobalStateShardMessage,
    IPhysicsDataStateShardMessage,
    IShardListItem,
    IShardMessage,
    IShipStateShardMessage,
    ISpawnAiResultShardMessage,
    ISpawnAiShardMessage,
    ISpawnResultShardMessage,
    ISpawnShardMessage,
    MoneyAccount
} from "./Interface";
import {
    EFaction,
    EShipType,
    FireControl,
    ISerializedFireControl,
    ISerializedShip,
    PHYSICS_SCALE,
    Ship,
    SHIP_DATA
} from "./Ship";
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
    moneyAccount: MoneyAccount;
    autoPilotEnabled: boolean;
    aiNodeName: string | undefined;
}

/**
 * A list of possible spawn planets.
 */
export interface ISpawnPlanet {
    planetId: string;
    numShipsAvailable: number;
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

/**
 * The type of message sent to and from the server.
 */
export enum EMessageType {
    JOIN = "JOIN",
    JOIN_RESULT = "JOIN_RESULT",
    CHOOSE_FACTION = "CHOOSE_FACTION",
    CHOOSE_PLANET = "CHOOSE_PLANET",
    SPAWN = "SPAWN",
    DEATH = "DEATH",
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

export interface ISpawnMessage extends IMessage {
    messageType: EMessageType.SPAWN;
    shipType: EShipType;
    planetId: string;
}

export interface IDeathMessage extends IMessage {
    messageType: EMessageType.DEATH;
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
 * The initial game data sent from server to client. Used to setup terrain.
 */
export interface IGameInitializationFrame {
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
}

export class Game {
    public voronoiShips: VoronoiTree<Ship> = new VoronoiTree(this);
    public voronoiTerrain: VoronoiTerrain = new VoronoiTerrain(this);
    public factions: { [key: string]: Faction } = {};
    public ships: Ship[] = [];
    public crates: Crate[] = [];
    public planets: Planet[] = [];
    public directedMarketTrade: Record<string, Array<IDirectedMarketTrade>> = {};
    public cannonBalls: CannonBall[] = [];
    public luxuryBuffs: LuxuryBuff[] = [];
    public worldScale: number = 3;
    public demoAttackingShipId: string | null = null;
    public lastDemoAttackingShipTime: Date = new Date();
    public tradeTick: number = 10 * 5;
    public playerData: IPlayerData[] = [];
    public playerSyncState: IPlayerSyncState[] = [];
    public incomingMessages: Array<[string, IMessage]> = [];
    public outgoingMessages: Array<[string, IMessage]> = [];
    public isTestMode: boolean = false;
    public serverType: EServerType = EServerType.STANDALONE;
    public physicsKingdomIndex: number | undefined = undefined;
    public aiNodeName: string | undefined = undefined;
    public fetchingOrder: Set<string> = new Set<string>();
    public spawningPlanets: Set<string> = new Set<string>();
    public updatingIds: Map<string, number> = new Map<string, number>();
    public monitoredShips: string[] = [];
    public shardList: IShardListItem[] = [];
    public shardName?: string;
    public aiShardCount: IAiShardCountItem[] = [];
    public outgoingShardMessages: Array<[string, IShardMessage]> = [];
    public incomingShardMessages: Array<[string, IShardMessage]> = [];

    /**
     * Velocity step size of ships.
     */
    public static VELOCITY_STEP: number = 1 / 6000;
    /**
     * The speed of the cannon ball projectiles.
     */
    public static PROJECTILE_SPEED: number = Game.VELOCITY_STEP * 100;
    /**
     * How long a cannon ball will live for in ticks.
     */
    public static PROJECTILE_LIFE: number = 40;
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

    /**
     * Get the initial game load for multiplayer purposes.
     */
    public getInitializationFrame(): IGameInitializationFrame {
        return {
            factions: Object.values(this.factions).map(f => f.serialize()),
            voronoiTerrain: this.voronoiTerrain.serialize(),
            ships: this.ships.map(s => s.serialize()),
            cannonBalls: this.cannonBalls.map(c => c.serialize()),
            crates: this.crates.map(c => c.serialize())
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
    private computeSyncDelta<T extends {id: string, serialize?() }>(oldData: T[], newData: T[], canUpdate: boolean): IGameSyncFrameDelta<T> {
        const oldHashes: [string, number, number][] = oldData.map((i, index) => [i.id, index, this.hashCode(JSON.stringify(i.serialize ? i.serialize() : i))]);
        const newHashes: [string, number, number][] = newData.map((i, index) => [i.id, index, this.hashCode(JSON.stringify(i.serialize ? i.serialize() : i))]);

        const create: T[] = [];
        const update: T[] = [];
        const remove: string[] = [];

        for (const newItem of newHashes) {
            const otherItem = oldHashes.find(i => i[0] === newItem[0]);
            if (otherItem) {
                if (canUpdate && newItem[2] !== otherItem[2]) {
                    update.push(newData[newItem[1]]);
                }
            } else {
                create.push(newData[newItem[1]]);
            }
        }
        for (const oldItem of oldHashes) {
            const otherItem = newHashes.find(i => i[0] === oldItem[0]);
            if (!otherItem) {
                remove.push(oldItem[0]);
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
            ships: this.computeSyncDelta(oldState.ships, newState.ships, true),
            crates: this.computeSyncDelta(oldState.crates, newState.crates, false),
            cannonBalls: this.computeSyncDelta(oldState.cannonBalls, newState.cannonBalls, false),
            planets: this.computeSyncDelta(oldState.planets, newState.planets, true),
            factions: this.computeSyncDelta(oldState.factions, newState.factions, true),
        };

        this.playerSyncState.splice(this.playerSyncState.indexOf(oldState), 1, newState);

        return item;
    }

    /**
     * Get a single frame of the game 10 times a second. For multiplayer purposes.
     */
    public getSyncFrame(playerData: IPlayerData, newPlayerState: IPlayerSyncState): IGameSyncFrame {
        let playerDelta: IPlayerSyncState = this.playerSyncState.find(p => p.id === playerData.id);
        if (!playerDelta) {
            playerDelta = {
                id: playerData.id,
                factions: [],
                planets: [],
                ships: [],
                crates: [],
                cannonBalls: []
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
    public static syncNetworkArray<T extends {id: string}, U extends {id: string}>(mainArray: T[], dataArray: IGameSyncFrameDelta<U>, createFunc: ((u: U) => T) | null, updateFunc: (t: T, u: U) => void) {
        for (const shipData of dataArray.create) {
            // ship does not exist, create a new one
            if (createFunc) {
                mainArray.push(createFunc(shipData));
            }
        }
        for (const shipData of dataArray.update) {
            const ship = mainArray.find(s => s.id === shipData.id);
            if (ship) {
                // ship did exist and still exist, simply update
                updateFunc(ship, shipData)
            } else if (createFunc) {
                mainArray.push(createFunc(shipData));
            }
        }
        // remove old ships
        for (const ship of dataArray.remove) {
            const index = mainArray.findIndex(s => s.id === ship);
            if (index >= 0) {
                mainArray.splice(index, 1);
            }
        }
    }

    /**
     * Sync an array of network objects.
     * @param mainArray The main array which should mutate.
     * @param dataArray The data array to apply to the main array.
     * @param createFunc A function to create a new instance.
     * @param updateFunc A function to update an old instance.
     */
    public static syncNetworkMap<T extends {id: string}, U extends {id: string}>(mainArray: Record<string, T>, dataArray: IGameSyncFrameDelta<U>, createFunc: ((u: U) => T) | null, updateFunc: (t: T, u: U) => void) {
        for (const shipData of dataArray.create) {
            // ship does not exist, create a new one
            if (createFunc) {
                mainArray[shipData.id] = createFunc(shipData);
            }
        }
        for (const shipData of dataArray.update) {
            const ship = mainArray[shipData.id];
            if (ship) {
                // ship did exist and still exist, simply update
                updateFunc(ship, shipData)
            } else if (createFunc) {
                mainArray[shipData.id] = createFunc(shipData);
            }
        }
        // remove old ships
        for (const shipId of dataArray.remove) {
            delete mainArray[shipId];
        }
    }

    /**
     * Apply an initial load frame to the game. For multiplayer purposes.
     * @param data
     */
    public applyGameInitializationFrame(data: IGameInitializationFrame) {
        for (const factionData of data.factions) {
            if (this.factions[factionData.id]) {
                this.factions[factionData.id].deserializeUpdate(factionData);
            } else {
                this.factions[factionData.id] = Faction.deserialize(this, factionData);
            }
        }

        this.voronoiTerrain = VoronoiTerrain.deserialize(this, data.voronoiTerrain);
        this.planets = Array.from(this.voronoiTerrain.getPlanets());

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
    }

    public getSpawnPlanets(playerData: IPlayerData): ISpawnPlanet[] {
        const spawnPlanets: ISpawnPlanet[] = [];

        // get faction
        let faction: Faction | null = null;
        if (playerData.factionId) {
            faction = this.factions[playerData.factionId];
        }

        if (faction) {
            // get planets of faction
            const planetsToSpawnAt = this.planets.filter(p => faction && faction.planetIds.includes(p.id))
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
                };
                spawnPlanets.push(spawnPlanet);
            }
        }

        return spawnPlanets;
    }
    public getSpawnLocations(playerData: IPlayerData): ISpawnLocation[] {
        const spawnLocations: ISpawnLocation[] = [];

        // get faction
        let faction: Faction | null = null;
        if (playerData.factionId) {
            faction = this.factions[playerData.factionId];
        }

        if (faction) {
            // get planets of faction
            const planetsToSpawnAt = this.planets.filter(p => faction && faction.planetIds.includes(p.id))
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
                    if (numShipsAvailable > 0) {
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

        return spawnLocations;
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

    public initializeGame() {
        // initialize 3d terrain stuff
        this.voronoiTerrain.generateTerrain();

        // initialize planets
        this.planets = Array.from(this.voronoiTerrain.getPlanets());

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
            // the dutch are a republic which means players can vote on things
            // but the dutch are weaker compared to the kingdoms
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
            this.factions[factionData.id] = faction;
            const planet = this.planets.find(p => p.id === planetId);
            if (planet) {
                planet.setAsStartingCapital();
                planet.claim(faction);
            }
            if (planet && !this.isTestMode) {
                for (let numShipsToStartWith = 0; numShipsToStartWith < 10; numShipsToStartWith++) {
                    const shipType = planet.shipyard.getNextShipTypeToBuild();
                    const shipData = SHIP_DATA.find(s => s.shipType === shipType);
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
    }

    /**
     * Get the currently selected player ship. This is a place holder method within the server class. It should return
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
     * @param shipIndex Index to get ship's state.
     * @param getActiveKeys Get the ship's active keys.
     * @param isAutomated If the function is called by AI, which shouldn't clear pathfinding logic.
     * @private
     */
    public handleShipLoop(shipIndex: number, getActiveKeys: () => string[], isAutomated: boolean) {
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
        } = this.ships[shipIndex];
        const shipData = SHIP_DATA.find(i => i.shipType === shipType);
        if (!shipData) {
            throw new Error("Could not find Ship Type");
        }
        const speedFactor = this.ships[shipIndex].getSpeedFactor();
        const cannonBalls = [
            ...this.cannonBalls.slice(-100)
        ];
        const newCannonBalls: CannonBall[] = [];

        let clearPathFindingPoints: boolean = false;

        const activeKeys = getActiveKeys();

        // handle movement
        if (activeKeys.includes("a")) {
            const rotation = Quaternion.fromAxisAngle([0, 0, 1], Math.PI).pow(Game.ROTATION_STEP);
            const rotationDrag = cameraOrientationVelocity.pow(Game.ROTATION_DRAG).inverse();
            cameraOrientationVelocity = cameraOrientationVelocity.clone().mul(rotation).mul(rotationDrag);
            if (VoronoiGraph.angularDistanceQuaternion(cameraOrientationVelocity, 1) < Math.PI * Game.ROTATION_STEP * 0.9) {
                cameraOrientationVelocity = Quaternion.ONE;
            }
        }
        if (activeKeys.includes("d")) {
            const rotation = Quaternion.fromAxisAngle([0, 0, 1], -Math.PI).pow(Game.ROTATION_STEP);
            const rotationDrag = cameraOrientationVelocity.pow(Game.ROTATION_DRAG).inverse();
            cameraOrientationVelocity = cameraOrientationVelocity.clone().mul(rotation).mul(rotationDrag);
            if (VoronoiGraph.angularDistanceQuaternion(cameraOrientationVelocity, 1) < Math.PI * Game.ROTATION_STEP * 0.9) {
                cameraOrientationVelocity = Quaternion.ONE;
            }
        }
        if (activeKeys.includes("w")) {
            const forward = cameraOrientation.clone().rotateVector([0, 1, 0]);
            const rotation = Quaternion.fromBetweenVectors([0, 0, 1], forward).pow(Game.VELOCITY_STEP / this.worldScale);
            const rotationDrag = cameraPositionVelocity.pow(Game.VELOCITY_DRAG / this.worldScale).inverse();
            cameraPositionVelocity = cameraPositionVelocity.clone().mul(rotation).mul(rotationDrag);
            if (VoronoiGraph.angularDistanceQuaternion(cameraPositionVelocity, this.worldScale) < Math.PI / 2 * Game.VELOCITY_STEP / this.worldScale) {
                cameraPositionVelocity = Quaternion.ONE;
            }
        }
        if (activeKeys.includes("s")) {
            const rotation = cameraPositionVelocity.clone().inverse().pow(Game.BRAKE_POWER / this.worldScale);
            cameraPositionVelocity = cameraPositionVelocity.clone().mul(rotation);
            if (VoronoiGraph.angularDistanceQuaternion(cameraPositionVelocity, this.worldScale) < Math.PI / 2 * Game.VELOCITY_STEP / this.worldScale) {
                cameraPositionVelocity = Quaternion.ONE;
            }
        }

        // handle main cannons
        if (activeKeys.includes(" ") && !cameraCannonLoading && cannonCoolDown <= 0) {
            cameraCannonLoading = new Date(Date.now());
        }
        if (!activeKeys.includes(" ") && cameraCannonLoading && faction && cannonCoolDown <= 0) {
            // cannon fire
            cameraCannonLoading = undefined;
            cannonCoolDown = 20;

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
                const cannonBall = new CannonBall(faction.id);
                cannonBall.id = `${cameraId}-${Math.floor(Math.random() * 100000000)}`;
                cannonBall.position = cameraPosition.clone();
                cannonBall.positionVelocity = fireVelocity.clone();
                cannonBall.size = 15;
                cannonBall.damage = 10;
                newCannonBalls.push(cannonBall);
            }
        }
        if (activeKeys.includes(" ") && cameraCannonLoading && Date.now() - +cameraCannonLoading > 3000) {
            // cancel cannon fire
            cameraCannonLoading = undefined;
        }

        // handle automatic cannonades
        for (let i = 0; i < this.ships[shipIndex].cannonadeCoolDown.length; i++) {
            const cannonadeCoolDown = this.ships[shipIndex].cannonadeCoolDown[i];
            if (cannonadeCoolDown <= 0) {
                // find nearby ship
                const targetVector = this.ships[shipIndex].fireControl.getTargetVector();
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

                // no faction, no cannon balls
                if (!faction) {
                    continue;
                }

                // roll a dice to have random cannonade fire
                if (Math.random() > 0.1) {
                    continue;
                }

                // create a cannon ball
                const cannonBall = new CannonBall(faction.id);
                cannonBall.id = `${cameraId}-${Math.floor(Math.random() * 100000000)}`;
                cannonBall.position = cameraPosition.clone();
                cannonBall.positionVelocity = fireVelocity.clone();
                cannonBall.size = 15;
                cannonBall.damage = 10;
                newCannonBalls.push(cannonBall);

                // apply a cool down to the cannonades
                this.ships[shipIndex].cannonadeCoolDown[i] = 45;
            } else if (cannonadeCoolDown > 0) {
                this.ships[shipIndex].cannonadeCoolDown[i] = this.ships[shipIndex].cannonadeCoolDown[i] - 1;
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
        if (cameraPosition !== this.ships[shipIndex].position && false) {
            const diffQuaternion = this.ships[shipIndex].position.clone().inverse().mul(cameraPosition.clone());
            cameraOrientation = cameraOrientation.clone().mul(diffQuaternion);
        }

        // handle cool downs
        if (cannonCoolDown > 0) {
            cannonCoolDown -= 1;
        }
        this.ships[shipIndex].handleHealthTick();

        this.ships[shipIndex].position = cameraPosition;
        this.ships[shipIndex].orientation = cameraOrientation;
        this.ships[shipIndex].positionVelocity = cameraPositionVelocity;
        this.ships[shipIndex].orientationVelocity = cameraOrientationVelocity;
        this.ships[shipIndex].cannonLoading = cameraCannonLoading;
        this.ships[shipIndex].cannonCoolDown = cannonCoolDown;
        if (clearPathFindingPoints) {
            this.ships[shipIndex].pathFinding.points = [];
        }
        this.cannonBalls = isAutomated ? [...cannonBalls, ...newCannonBalls] : [...cannonBalls];

        // emit ship state events if not automated, i.e is player controlled
        if (!isAutomated) {
            const playerData = this.playerData.find(p => p.shipId === this.ships[shipIndex].id);
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
     * Compute a cannon ball collision.
     * @param cannonBall The cannon ball to shoot.
     * @param ship The ship to collide against.
     * @param worldScale The size of the world.
     * @private
     */
    public static cannonBallCollision(cannonBall: ICollidable, ship: Ship, worldScale: number): IHitTest {
        const shipData = SHIP_DATA.find(s => s.shipType === ship.shipType);
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
            this.computeSyncDelta(Object.values(this.factions), message.factions.map(f => Faction.deserialize(this, f)), true),
            (v: Faction) => v,
            (s: Faction, v: Faction) => s.deserializeUpdate(v.serialize())
        );
    }

    private aiPlayerDataCombined: {
        playerData: IPlayerData[],
        ships: Array<{
            shipId: string,
            shipKeys: string[],
            orders: ISerializedOrder[],
            pathFinding: ISerializedPathFinder,
            fireControl: ISerializedFireControl
        }>
    } = {
        playerData: [],
        ships: []
    };
    private readyLoadAIPlayerDataStateMessage(message: IAIPlayerDataStateShardMessage) {
        // add data to the frame
        this.aiPlayerDataCombined.playerData.push(...message.playerData);
        this.aiPlayerDataCombined.ships.push(...message.ships);
    }
    private loadAIPlayerDataStateMessage() {
        // apply data to game state
        Game.syncNetworkArray(
            this.playerData,
            this.computeSyncDelta(this.playerData, this.aiPlayerDataCombined.playerData, true),
            (o) => o,
            (o, d) => {
                Object.apply(o, [o, d]);
            }
        );
        for (const item of this.aiPlayerDataCombined.ships) {
            const ship = this.ships.find(s => s.id === item.shipId);
            if (ship) {
                ship.activeKeys.splice(0, ship.activeKeys.length, ...item.shipKeys);
                ship.orders.splice(0, ship.orders.length, ...item.orders.map(o => Order.deserialize(this, ship, o)));
                ship.pathFinding = PathFinder.deserialize(ship, item.pathFinding);
                ship.fireControl = FireControl.deserialize(this, ship, item.fireControl);
            }
        }

        // clear old data to reset frame
        this.aiPlayerDataCombined.playerData = [];
        this.aiPlayerDataCombined.ships = [];
    }

    private physicsDataCombined: {
        ships: ISerializedShip[],
        cannonBalls: ISerializedCannonBall[],
        crates: ISerializedCrate[],
        planets: ISerializedPlanetFull[]
    } = {
        ships: [],
        cannonBalls: [],
        crates: [],
        planets: []
    };
    private readyLoadPhysicsDataStateMessage(message: IPhysicsDataStateShardMessage) {
        // add data to the frame
        this.physicsDataCombined.ships.push(...message.ships);
        this.physicsDataCombined.cannonBalls.push(...message.cannonBalls);
        this.physicsDataCombined.crates.push(...message.crates);
        this.physicsDataCombined.planets.push(...message.planets);
    }
    private loadPhysicsDataStateMessages() {
        // apply data to game state
        Game.syncNetworkArray(
            this.ships,
            this.computeSyncDelta(this.ships, this.physicsDataCombined.ships.map(s => Ship.deserialize(this, s)), true),
            (o) => o,
            (o, d) => o.deserializeUpdate(d.serialize())
        );
        Game.syncNetworkArray(
            this.cannonBalls,
            this.computeSyncDelta(this.cannonBalls, this.physicsDataCombined.cannonBalls.map(s => CannonBall.deserialize(s)), true),
            (o) => o,
            (o, d) => o.deserializeUpdate(d.serialize())
        );
        Game.syncNetworkArray(
            this.crates,
            this.computeSyncDelta(this.crates, this.physicsDataCombined.crates.map(s => Crate.deserialize(s)), true),
            (o) => o,
            (o, d) => o.deserializeUpdate(d.serialize())
        );
        for (const item of this.physicsDataCombined.planets) {
            const planet = this.planets.find(p => p.id === item.id);
            if (planet) {
                planet.deserializeUpdateFull(item);
            }
        }

        // clear the frame
        this.physicsDataCombined.ships = [];
        this.physicsDataCombined.cannonBalls = [];
        this.physicsDataCombined.crates = [];
        this.physicsDataCombined.planets = [];
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
                            case EShardMessageType.SPAWN_AI_SHIP: {
                                // forward message to the best AI node
                                const bestShardCount = this.aiShardCount.sort((a, b) => a.numAI - b.numAI)[0];
                                const aiShard = this.shardList.find(s => s.name === bestShardCount.name);
                                this.outgoingShardMessages.push([aiShard.name, message]);
                                bestShardCount.numAI += 1;
                                break;
                            }
                            case EShardMessageType.SPAWN_SHIP: {
                                // forward message to the best AI node
                                const bestShardCount = this.aiShardCount.find(s => s.players.includes((message as ISpawnShardMessage).playerId));
                                const aiShard = this.shardList.find(s => s.name === bestShardCount.name);
                                this.outgoingShardMessages.push([aiShard.name, message]);
                                bestShardCount.numAI += 1;
                                break;
                            }
                        }
                        break;
                    }
                    case EServerType.GLOBAL_STATE_NODE: {
                        switch (message.shardMessageType) {
                            case EShardMessageType.AI_PLAYER_DATA_STATE: {
                                this.readyLoadAIPlayerDataStateMessage(message as IAIPlayerDataStateShardMessage);
                                break;
                            }
                            case EShardMessageType.PHYSICS_DATA_STATE: {
                                this.readyLoadPhysicsDataStateMessage(message as IPhysicsDataStateShardMessage);
                                break;
                            }
                        }
                        break;
                    }
                    case EServerType.AI_NODE: {
                        switch (message.shardMessageType) {
                            case EShardMessageType.SPAWN_AI_SHIP: {
                                const {
                                    planetId
                                } = message as ISpawnAiShardMessage;
                                const planet = this.planets.find(p => p.id === planetId);
                                if (planet) {
                                    const kingdomIndex = planet.county.duchy.kingdom.terrain.kingdoms.indexOf(planet.county.duchy.kingdom);
                                    const physicsNode = this.shardList.find(s => s.type === EServerType.PHYSICS_NODE && s.kingdomIndex === kingdomIndex);
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
                                this.monitoredShips.push(shipId);
                                const loadBalancer = this.shardList.find(s => s.type === EServerType.LOAD_BALANCER);
                                if (loadBalancer) {
                                    this.outgoingShardMessages.push([loadBalancer.name, message]);
                                }
                                break;
                            }
                            case EShardMessageType.SPAWN_SHIP: {
                                const {
                                    planetId
                                } = message as ISpawnShardMessage;
                                const planet = this.planets.find(p => p.id === planetId);
                                if (planet) {
                                    const kingdomIndex = planet.county.duchy.kingdom.terrain.kingdoms.indexOf(planet.county.duchy.kingdom);
                                    const physicsNode = this.shardList.find(s => s.type === EServerType.PHYSICS_NODE && s.kingdomIndex === kingdomIndex);
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
                                const player = this.playerData.find(p => p.id === playerId);
                                if (!player) {
                                    continue;
                                }
                                player.shipId = shipId;
                                this.monitoredShips.push(shipId);
                                const loadBalancer = this.shardList.find(s => s.type === EServerType.LOAD_BALANCER);
                                if (loadBalancer) {
                                    this.outgoingShardMessages.push([loadBalancer.name, message]);
                                }
                                break;
                            }
                            case EShardMessageType.FETCH_ORDER_RESULT: {
                                const {
                                    order,
                                    shipId
                                } = message as IFetchOrderResultShardMessage;
                                const ship = this.ships.find(s => s.id === shipId);
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
                                const player = this.playerData.find(p => p.id === playerId);
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
                                this.readyLoadPhysicsDataStateMessage(message as IPhysicsDataStateShardMessage);
                                break;
                            }
                        }
                        break;
                    }
                    case EServerType.PHYSICS_NODE: {
                        switch (message.shardMessageType) {
                            case EShardMessageType.SPAWN_AI_SHIP: {
                                const spawnMessage = message as ISpawnAiShardMessage;
                                const {
                                    planetId,
                                    shipType
                                } = spawnMessage;
                                const planet = this.planets.find(p => p.id === planetId);
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
                                const planet = this.planets.find(p => p.id === planetId);

                                const player = this.playerData.find(p => p.id === playerId);
                                if (!player) {
                                    continue;
                                }
                                const playerShip = planet.shipyard.buyShip(player.moneyAccount, shipType);
                                player.shipId = playerShip.id;

                                const spawnShipResultMessage: ISpawnResultShardMessage = {
                                    shardMessageType: EShardMessageType.SPAWN_SHIP_RESULT,
                                    playerId,
                                    shipId: playerShip.id
                                };
                                this.outgoingShardMessages.push([fromShardName, spawnShipResultMessage]);
                                break;
                            }
                            case EShardMessageType.SHIP_STATE: {
                                const shipStateMessage = message as IShipStateShardMessage;
                                const playerId = shipStateMessage.playerId;

                                const player = this.playerData.find(p => p.id === playerId);
                                if (!player) {
                                    continue;
                                }

                                const ship = this.ships.find(s => s.id === player.shipId);
                                if (ship) {
                                    // update ship position
                                    ship.position = DeserializeQuaternion(shipStateMessage.position);
                                    ship.positionVelocity = DeserializeQuaternion(shipStateMessage.positionVelocity);
                                    ship.orientation = DeserializeQuaternion(shipStateMessage.orientation);
                                    ship.orientationVelocity = DeserializeQuaternion(shipStateMessage.orientationVelocity);

                                    // add new cannon balls
                                    this.cannonBalls.push.apply(
                                        this.cannonBalls,
                                        shipStateMessage.newCannonBalls.map(c => CannonBall.deserialize(c))
                                    );
                                }
                                break;
                            }
                            case EShardMessageType.GLOBAL_STATE: {
                                this.loadGlobalStateMessage(message as IGlobalStateShardMessage);
                                break;
                            }
                            case EShardMessageType.AI_PLAYER_DATA_STATE: {
                                this.readyLoadAIPlayerDataStateMessage(message as IAIPlayerDataStateShardMessage);
                                break;
                            }
                            case EShardMessageType.PHYSICS_DATA_STATE: {
                                this.readyLoadPhysicsDataStateMessage(message as IPhysicsDataStateShardMessage);
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
                this.loadPhysicsDataStateMessages();
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
                for (const ship of this.ships) {
                    if (isInKingdom(ship)) {
                        this.updatingIds.set(ship.id, 0);
                    }
                }
                for (const crate of this.crates) {
                    if (isInKingdom(crate)) {
                        this.updatingIds.set(crate.id, 0);
                    }
                }
                for (const cannonBall of this.cannonBalls) {
                    if (isInKingdom(cannonBall)) {
                        this.updatingIds.set(cannonBall.id, 0);
                    }
                }

                // add current ships to the list of ships to load
                const isUpdated = (c: ICameraState): boolean => isInKingdom(c) || this.updatingIds.has(c.id);
                this.physicsDataCombined.ships.unshift(...this.ships.filter(isUpdated).map(s => s.serialize()));
                this.physicsDataCombined.crates.unshift(...this.crates.filter(isUpdated).map(s => s.serialize()));
                this.physicsDataCombined.cannonBalls.unshift(...this.cannonBalls.filter(isUpdated).map(s => s.serialize()));
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
                    factions: Object.values(this.factions).map(f => f.serialize())
                };
                for (const shard of this.shardList) {
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
                for (const playerData of this.playerData) {
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
                    const ship = this.ships.find(s => s.id === shipId);
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
                for (const shard of this.shardList) {
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
                const isUpdatable = (c: ICameraState): boolean => isInKingdom(c) || (this.updatingIds.has(c.id) && this.updatingIds.get(c.id) <= 5);
                for (const ship of this.ships) {
                    if (!isUpdatable(ship)) {
                        continue;
                    }
                    ships.push(ship);
                }
                for (const cannonBall of this.cannonBalls) {
                    if (!isUpdatable(cannonBall)) {
                        continue;
                    }
                    cannonBalls.push(cannonBall);
                }
                for (const crate of this.crates) {
                    if (!isUpdatable(crate)) {
                        continue;
                    }
                    crates.push(crate);
                }
                for (const planet of this.planets) {
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
                };

                for (const shard of this.shardList) {
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
     * Handle server responsibilities. Move things around and compute collisions.
     */
    public handleServerLoop() {
        this.handleServerShardPreLoop();

        // DONE - should be converted into SHARD FORMAT
        // handle player input, if in shard mode, forward from  browser -> AI -> Physics
        // handle player input
        // the AI will remember the player's keys and send special spawn ship messages to the Physics
        if ([EServerType.STANDALONE, EServerType.AI_NODE].includes(this.serverType)) {
            // handle key strokes
            while (true) {
                const item = this.incomingMessages.shift();
                if (item) {
                    const [playerId, message] = item;
                    // has message, process message
                    if (message.messageType === EMessageType.JOIN) {
                        const joinMessage = message as IJoinMessage;

                        const player = this.playerData.find(p => p.id === playerId);
                        if (!player) {
                            this.playerData.push({
                                id: playerId,
                                name: joinMessage.name,
                                factionId: null,
                                planetId: null,
                                shipId: "",
                                activeKeys: [],
                                moneyAccount: new MoneyAccount(2000),
                                autoPilotEnabled: true,
                                aiNodeName: this.aiNodeName
                            });
                        }
                    } else if (message.messageType === EMessageType.CHOOSE_FACTION) {
                        const chooseFactionMessage = message as IChooseFactionMessage;

                        const player = this.playerData.find(p => p.id === playerId);
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

                        const player = this.playerData.find(p => p.id === playerId);
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
                        const planet = this.planets.find(p => p.id === planetId);

                        const player = this.playerData.find(p => p.id === playerId);
                        if (!player) {
                            continue;
                        }

                        if (planet && player && player.moneyAccount.hasEnough(planet.shipyard.quoteShip(shipType))) {
                            if ([EServerType.STANDALONE].includes(this.serverType)) {
                                const playerShip = planet.shipyard.buyShip(player.moneyAccount, shipType);
                                player.shipId = playerShip.id;
                            } else if ([EServerType.AI_NODE].includes(this.serverType)) {
                                const loadBalancer = this.shardList.find(s => s.type === EServerType.LOAD_BALANCER);
                                const spawnShipMessage: ISpawnShardMessage = {
                                    shardMessageType: EShardMessageType.SPAWN_SHIP,
                                    shipType,
                                    planetId,
                                    playerId: player.id
                                };
                                this.outgoingShardMessages.push([loadBalancer.name, spawnShipMessage]);
                            }
                        }
                    } if (message.messageType === EMessageType.AUTOPILOT) {
                        const autoPilotMessage = message as IAutoPilotMessage;

                        const player = this.playerData.find(p => p.id === playerId);
                        if (!player) {
                            continue;
                        }

                        if (player) {
                            player.autoPilotEnabled = autoPilotMessage.enabled;
                        }
                    } else if (message.messageType === EMessageType.SHIP_STATE) {
                        const shipStateMessage = message as IShipStateMessage;

                        const player = this.playerData.find(p => p.id === playerId);
                        if (!player) {
                            continue;
                        }

                        if (player && !player.autoPilotEnabled) {
                            const ship = this.ships.find(s => s.id === player.shipId);
                            if (ship) {
                                if ([EServerType.STANDALONE].includes(this.serverType)) {
                                    // update ship position
                                    ship.position = DeserializeQuaternion(shipStateMessage.position);
                                    ship.positionVelocity = DeserializeQuaternion(shipStateMessage.positionVelocity);
                                    ship.orientation = DeserializeQuaternion(shipStateMessage.orientation);
                                    ship.orientationVelocity = DeserializeQuaternion(shipStateMessage.orientationVelocity);

                                    // add new cannon balls
                                    this.cannonBalls.push.apply(
                                        this.cannonBalls,
                                        shipStateMessage.newCannonBalls.map(c => CannonBall.deserialize(c))
                                    );
                                } else if ([EServerType.AI_NODE].includes(this.serverType)) {
                                    const planet = this.voronoiTerrain.getNearestPlanet(ship.position.rotateVector([0, 0, 1]));
                                    const kingdomIndex = planet.county.duchy.kingdom.terrain.kingdoms.indexOf(planet.county.duchy.kingdom);
                                    const kingdomPhysicsNode = this.shardList.find(p => p.type === EServerType.PHYSICS_NODE && p.kingdomIndex === kingdomIndex);
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
                            const bestShardCount = this.aiShardCount.sort((a, b) => a.players.length - b.players.length)[0];
                            const aiShard = this.shardList.find(s => s.name === bestShardCount.name);
                            bestShardCount.numAI += 1;
                            bestShardCount.players.push(playerId);
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
            // expire cannon balls and crates
            const expirableArrays: Array<{
                array: IExpirableTicks[],
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
                const expiredEntities: IExpirableTicks[] = [];
                for (const entity of expirableArray) {
                    const isExpired = entity.life >= entity.maxLife;
                    if (isExpired) {
                        expiredEntities.push(entity);
                    }
                }

                // remove expired entities
                for (const expiredEntity of expiredEntities) {
                    const index = expirableArray.findIndex(s => s === expiredEntity);
                    if (index >= 0) {
                        expirableArray.splice(index, 1);
                        removeFromDataStructures.call(this, expiredEntity);
                    }
                }
            }

            // move cannon balls and crates
            const movableArrays: Array<Array<ICameraState & IExpirableTicks>> = [
                this.cannonBalls,
                this.crates
            ];
            for (const movableArray of movableArrays) {
                for (const entity of movableArray) {
                    entity.position = entity.position.clone().mul(entity.positionVelocity.clone());
                    entity.orientation = entity.orientation.clone().mul(entity.orientationVelocity.clone());
                    entity.life += 1;
                }
            }

            // handle physics and collision detection
            const collidableArrays: Array<{
                arr: ICollidable[],
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
                const entitiesToRemove = [];
                for (const entity of collidableArray) {
                    // get nearby ships
                    const position = entity.position.rotateVector([0, 0, 1]);
                    const nearByShips = Array.from(this.voronoiShips.listItems(position));

                    // compute closest ship
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
                        entitiesToRemove.push(entity);
                    }
                }
                // remove collided cannon balls
                for (const entityToRemove of entitiesToRemove) {
                    const index = collidableArray.findIndex(c => c === entityToRemove);
                    if (index >= 0) {
                        collidableArray.splice(index, 1);
                        removeFromDataStructures.call(this, entityToRemove);
                    }
                }
            }
        }

        // DONE - should be converted into SHARD FORMAT
        // update collision acceleration structures
        // required by AI and PHYSICS
        if ([EServerType.STANDALONE, EServerType.PHYSICS_NODE, EServerType.AI_NODE].includes(this.serverType)) {
            for (const ship of this.ships) {
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
            for (let i = 0; i < this.ships.length; i++) {
                const ship = this.ships[i];

                // skip ships which are not controlled by the shard
                if ([EServerType.PHYSICS_NODE].includes(this.serverType)) {
                    const planet = this.voronoiTerrain.getNearestPlanet(ship.position.rotateVector([0, 0, 1]));
                    const kingdomIndex = planet.county.duchy.kingdom.terrain.kingdoms.indexOf(planet.county.duchy.kingdom);
                    if (kingdomIndex !== this.physicsKingdomIndex) {
                        continue;
                    }
                }
                if ([EServerType.AI_NODE].includes(this.serverType)) {
                    const playerData = this.playerData.find(p => p.shipId === ship.id);
                    if (!playerData) {
                        continue;
                    }
                }

                // handle ship health
                if ([EServerType.STANDALONE, EServerType.PHYSICS_NODE].includes(this.serverType)) {
                    if (ship.health <= 0) {
                        destroyedShips.push(ship);
                        const crates = ship.destroy();
                        for (const crate of crates) {
                            this.crates.push(crate);
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
                                const physicsNode = this.shardList.find(s => s.type === EServerType.PHYSICS_NODE && s.kingdomIndex === kingdomIndex);
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
                    const playerData = this.playerData.find(d => d.shipId === ship.id);
                    if (playerData && !playerData.autoPilotEnabled) {
                        // ship is player ship which has no auto pilot, accept player control
                        this.handleShipLoop(i, () => playerData.activeKeys, false);
                    } else {
                        // ship is npc ship if autoPilot is not enabled
                        this.handleShipLoop(i, () => ship.activeKeys, true);
                    }
                }
            }

            // remove destroyed ships
            if ([EServerType.STANDALONE, EServerType.PHYSICS_NODE].includes(this.serverType)) {
                for (const destroyedShip of destroyedShips) {
                    const playerIndex = this.playerData.findIndex(p => p.shipId === destroyedShip.id);
                    if (playerIndex >= 0) {
                        if ([EServerType.STANDALONE].includes(this.serverType)) {
                            const player = this.playerData[playerIndex];
                            player.shipId = "";
                            const message: IDeathMessage = {
                                messageType: EMessageType.DEATH
                            };
                            this.outgoingMessages.push([player.id, message]);
                        } else if ([EServerType.PHYSICS_NODE].includes(this.serverType)) {
                            const aiNodeName = this.playerData[playerIndex].aiNodeName;
                            const message: IDeathShardMessage = {
                                shardMessageType: EShardMessageType.DEATH,
                                playerId: this.playerData[playerIndex].id
                            };
                            this.outgoingShardMessages.push([aiNodeName, message]);
                        }
                    }
                    const index = this.ships.findIndex(s => s === destroyedShip);
                    if (index >= 0) {
                        this.ships.splice(index, 1);
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
            for (const ship of this.ships) {
                this.voronoiShips.addItem(ship);
            }
            for (const ship of this.ships) {
                this.voronoiTerrain.updateShip(ship);
            }
            for (const cannonBall of this.cannonBalls) {
                this.voronoiTerrain.updateCannonBall(cannonBall);
            }
            for (const crate of this.crates) {
                this.voronoiTerrain.updateCrate(crate);
            }
        }

        // DONE - should be converted into SHARD FORMAT
        // AI will send order updates to physics
        // - send order updates to PHYSICS
        // AI -> PHYSICS
        if ([EServerType.STANDALONE, EServerType.AI_NODE].includes(this.serverType)) {
            for (const ship of this.ships) {
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

                    // find closest target
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
                        if (!closestDistance || distance < closestDistance) {
                            closestDistance = distance;
                            closestTarget = nearByEnemyShip;
                        }

                        const shipData = SHIP_DATA.find(s => s.shipType === nearByEnemyShip.shipType);
                        if (!shipData) {
                            throw new Error("Could not find ship type");
                        }
                        numEnemyCannons += shipData.cannons.numCannons;
                    }
                    for (const nearByFriendlyShip of nearByFriendlyShips) {
                        const shipData = SHIP_DATA.find(s => s.shipType === nearByFriendlyShip.shipType);
                        if (!shipData) {
                            throw new Error("Could not find ship type");
                        }
                        numFriendlyCannons += shipData.cannons.numCannons;
                    }

                    // set closest target
                    if (closestTarget) {
                        ship.fireControl.targetShipId = closestTarget.id;
                        if (!this.demoAttackingShipId || +this.lastDemoAttackingShipTime + 30 * 1000 < +new Date()) {
                            this.demoAttackingShipId = ship.id;
                            this.lastDemoAttackingShipTime = new Date();
                        }
                    }

                    // if too many ships, cancel order and stop attacking
                    const currentShipData = SHIP_DATA.find(s => s.shipType === ship.shipType);
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
            for (const planet of this.planets) {
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
            // handle AI factions
            for (const faction of Object.values(this.factions)) {
                faction.handleFactionLoop();
            }
        }

        // global state
        // fetch physics        - DONE
        // fetch ai             - DONE
        // send faction         - DONE

        // ai
        // fetch crates         - DONE
        // fetch cannon balls   - DONE
        // fetch ships          - DONE
        // fetch planets        - DONE
        // send keys            - DONE
        // send playerData      - DONE
        // send orders          - DONE

        // physics
        // fetch playerData     - DONE
        // fetch keys           - DONE
        // fetch orders         - DONE
        // send cannonballs     - DONE
        // send crates          - DONE
        // send planets         - DONE
        // send ships           - DONE
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

            // compute mid points used in tessellation
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
}