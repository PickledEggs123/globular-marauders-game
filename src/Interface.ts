import Quaternion from "quaternion";
import {ISerializedPathFinder, PathFinder} from "./Graph";
import {ISerializedFireControl, ISerializedShip} from "./Ship";
import {ISerializedPlanetFull, Planet} from "./Planet";
import {Crate, ISerializedCannonBall, ISerializedCrate, ISerializedQuaternion} from "./Item";
import {Game, IPlayerData} from "./Game";
import {EResourceType} from "./Resource";
import {ISerializedFaction} from "./Faction";
import {ISerializedOrder} from "./Order";
import {EShipType} from "./ShipType";
import {EFaction} from "./EFaction";

/**
 * An interface used to represent an attribute of a mesh.
 */
export interface IGameMeshAttribute {
    /**
     * The name of the attribute of a mesh, used by the shader.
     */
    id: string;
    /**
     * The numeric data of the attribute. Such as position or color.
     */
    buffer: number[];
    /**
     * The number of components in each attribute, such as 3 - xyz or 2 - xy.
     */
    size: number;
}

/**
 * A mesh object used to represent a complete object to draw, does not contain shader.
 */
export interface IGameMesh {
    attributes: IGameMeshAttribute[];
    index: number[];
}

/**
 * The different server types which will affect how the server loop will execute.
 */
export enum EServerType {
    // the game is a traditional single process server instance, useful for arcade style gameplay and unit testing
    STANDALONE = "STANDALONE",
    // the game is a load balancing instance which spreads players among a set of AI_NODES
    LOAD_BALANCER = "LOAD_BALANCER",
    // the game is an AI node which read physics and global state information and make AutoPilot behaviors,
    // or a player can input keyboard keys manually to perform actions
    AI_NODE = "AI_NODE",
    // the game is a slice of the world, responsible for movement and collisions within it's sector/kingdom
    // it will output to AI nodes and Global State nodes.
    PHYSICS_NODE = "PHYSICS_NODE",
    // the game is an aggregate and summary of all physics node information. This makes this node excellent at
    // large strategic faction planning and score keeping.
    GLOBAL_STATE_NODE = "GLOBAL_STATE_NODE"
}

export enum EShardMessageType {
    GLOBAL_STATE = "GLOBAL_STATE",
    AI_PLAYER_DATA_STATE = "AI_PLAYER_DATA_STATE",
    PHYSICS_DATA_STATE = "PHYSICS_DATA_STATE",
    DAMAGE_SCORE = "DAMAGE_SCORE",
    JOIN_ALIAS = "JOIN_ALIAS",
    LOOT_SCORE = "LOOT_SCORE",
    CLAIM_PLANET = "CLAIM_PLANET",
    CREATE_SHIP_FACTION = "CREATE_SHIP_FACTION",
    DESTROY_SHIP_PLANET = "DESTROY_SHIP_PLANET",
    DESTROY_SHIP_FACTION = "DESTROY_SHIP_FACTION",
    TRIBUTE_SHIP_PLANET = "TRIBUTE_SHIP_PLANET",
    TRADE_SHIP_PLANET = "TRADE_SHIP_PLANET",
    INVEST_DEPOSIT_AMOUNT = "INVEST_DEPOSIT_AMOUNT",
    INVEST_WITHDRAW_AMOUNT = "INVEST_WITHDRAW_AMOUNT",
    SPAWN_SHIP = "SPAWN_SHIP",
    SPAWN_SHIP_RESULT = "SPAWN_SHIP_RESULT",
    SPAWN_AI_SHIP = "SPAWN_AI_SHIP",
    SPAWN_AI_SHIP_RESULT = "SPAWN_AI_SHIP_RESULT",
    FETCH_ORDER = "FETCH_ORDER",
    FETCH_ORDER_RESULT = "FETCH_ORDER_RESULT",
    SHIP_STATE = "SHIP_STATE",
    DEATH = "DEATH",
}

/**
 * A message from one shard to another shard.
 */
export interface IShardMessage {
    shardMessageType: EShardMessageType;
}

export interface IGlobalStateShardMessage extends IShardMessage {
    shardMessageType: EShardMessageType.GLOBAL_STATE;
    factions: ISerializedFaction[];
    scoreBoard: IScoreBoard;
}

export interface IAIPlayerDataStateShardMessage extends IShardMessage {
    shardMessageType: EShardMessageType.AI_PLAYER_DATA_STATE;
    playerData: IPlayerData[];
    ships: Array<{
        shipId: string;
        shipKeys: string[];
        orders: ISerializedOrder[];
        pathFinding: ISerializedPathFinder;
        fireControl: ISerializedFireControl;
    }>;
}

export interface IPhysicsDataStateShardMessage extends IShardMessage {
    shardMessageType: EShardMessageType.PHYSICS_DATA_STATE;
    planets: ISerializedPlanetFull[];
    ships: ISerializedShip[];
    cannonBalls: ISerializedCannonBall[];
    crates: ISerializedCrate[];
    transferIds: string[];
}

export interface IDamageScoreShardMessage extends IShardMessage {
    shardMessageType: EShardMessageType.DAMAGE_SCORE;
    playerId: string;
    name: string;
    damage: number;
}

export interface IJoinAliasShardMessage extends IShardMessage {
    shardMessageType: EShardMessageType.JOIN_ALIAS;
    playerId: string;
    name: string;
}

export interface ILootScoreShardMessage extends IShardMessage {
    shardMessageType: EShardMessageType.LOOT_SCORE;
    playerId: string;
    name: string;
    count: number;
}

export interface IClaimPlanetShardMessage extends IShardMessage {
    shardMessageType: EShardMessageType.CLAIM_PLANET;
    planetId: string;
    factionId: string;
    fromShard: string;
}

export interface ICreateShipFactionShardMessage extends IShardMessage {
    shardMessageType: EShardMessageType.CREATE_SHIP_FACTION;
    factionId: string;
    shipId: string;
    shipType: EShipType;
}

export interface IDestroyShipPlanetShardMessage extends IShardMessage {
    shardMessageType: EShardMessageType.DESTROY_SHIP_PLANET;
    planetId: string;
    shipId: string;
}

export interface IDestroyShipFactionShardMessage extends IShardMessage {
    shardMessageType: EShardMessageType.DESTROY_SHIP_FACTION;
    factionId: string;
    shipId: string;
}

export interface ITributeShipPlanetShardMessage extends IShardMessage {
    shardMessageType: EShardMessageType.TRIBUTE_SHIP_PLANET;
    planetId: string;
    shipId: string;
}

export interface ITradeShipPlanetShardMessage extends IShardMessage {
    shardMessageType: EShardMessageType.TRADE_SHIP_PLANET;
    planetId: string;
    shipId: string;
    unload: boolean;
    specificBuy: EResourceType | null;
}

export interface IInvestDepositShardMessage extends IShardMessage {
    shardMessageType: EShardMessageType.INVEST_DEPOSIT_AMOUNT;
    amount: number;
    planetId: string;
    playerId: string;
}

export interface IInvestWithdrawShardMessage extends IShardMessage {
    shardMessageType: EShardMessageType.INVEST_WITHDRAW_AMOUNT;
    amount: number;
    planetId: string;
    playerId: string;
}

export interface ISpawnShardMessage extends IShardMessage {
    shardMessageType: EShardMessageType.SPAWN_SHIP;
    shipType: EShipType;
    planetId: string;
    playerId: string;
}

export interface ISpawnResultShardMessage extends IShardMessage {
    shardMessageType: EShardMessageType.SPAWN_SHIP_RESULT;
    playerId: string;
    shipId: string;
}

export interface ISpawnAiShardMessage extends IShardMessage {
    shardMessageType: EShardMessageType.SPAWN_AI_SHIP;
    shipType: EShipType;
    planetId: string;
}

export interface ISpawnAiResultShardMessage extends IShardMessage {
    shardMessageType: EShardMessageType.SPAWN_AI_SHIP_RESULT;
    shipId: string;
}

export interface IFetchOrderShardMessage extends IShardMessage {
    shardMessageType: EShardMessageType.FETCH_ORDER;
    shipId: string;
}

export interface IFetchOrderResultShardMessage extends IShardMessage {
    shardMessageType: EShardMessageType.FETCH_ORDER_RESULT;
    shipId: string;
    order: ISerializedOrder;
}

export interface IShipStateShardMessage extends IShardMessage {
    shardMessageType: EShardMessageType.SHIP_STATE;
    playerId: string;
    position: ISerializedQuaternion;
    positionVelocity: ISerializedQuaternion;
    orientation: ISerializedQuaternion;
    orientationVelocity: ISerializedQuaternion;
    newCannonBalls: ISerializedCannonBall[];
}

export interface IDeathShardMessage extends IShardMessage {
    shardMessageType: EShardMessageType.DEATH;
    playerId: string;
}


/**
 * A list item containing information about each shard. Used by the shards for peer to peer communication.
 */
export interface IShardListItem {
    name: string;
    type: EServerType;
    kingdomIndex?: number;
    aiNodeName?: string;
}

/**
 * A list of players and AI per AI shard.
 */
export interface IAiShardCountItem {
    name: string;
    players: string[];
    numAI: number;
}

/**
 * Top player damage in the world. Based on how many cannon balls of damage they have done. This is the amount of
 * health damage a player has caused.
 *
 * Easy, just count the number of damage done.
 */
export interface IScoreBoardDamageItem {
    playerId: string;
    name: string;
    damage: number;
}


/**
 * Top player piracy, looting, in the world. Based on how many crates they pirated. Killing a small trading ship like
 * a cutter then stealing it's cargo is considered piracy. Returning pirated cargo will reward you with cash.
 *
 * Easy, just count the number of cargo looted.
 */
export interface IScoreBoardLootItem {
    playerId: string;
    name: string;
    count: number;
}

/**
 * Top player money, in the world. Based on how much money they have. The player will receive money through:
 * - looting piracy
 * - completing missions
 * - investing in real estate on planets
 *
 * Easy, just count the amount of cash on a player.
 *
 * Difficult, create planet real estate:
 * - A list of buildings you can build on a planet which will provide income:
 *     - Housing
 *     - Manufacturing
 *     - Retail
 *     - Hospitality
 *     - Shipyard
 *     - Forestry
 * - When a faction captures a planet, all real estate will lose their owners and will be auctioned off.
 *
 * - Screen to make new or buy used
 * - Screen to auction
 *
 * Easy, create planet investment fund with predictable price movements.
 */
export interface IScoreBoardMoneyItem {
    playerId: string;
    name: string;
    amount: number;
}

/**
 * Top player land, in the world. Based on how many planets they own. Very rich players or honorable players will have
 * the option of purchasing an entire planet and collecting it's tax revenue. They will then have the option to choose
 * economic policy such as battle march (small planet with lots of weapons), free city (small planet with lots of trade),
 * or other economic policies. Owning land will also give a title to players:
 * - 1 planet - Count
 * - 2 planets - Baron
 * - 3 planets - Duke
 * - 2 Duchies - Arch Duke
 * - 3 Duchies - King
 * - 2 Kingdoms - Emperor
 *
 * Medium, many steps and UI screens:
 * - Player field in Feudal Government
 * - Player Titles in PLayer Data
 * - Player visit Feudal Realm to pick Policy and tax rate
 * - Player visit Capital to buy or sell Feudal Land.
 */
export interface IScoreBoardLandItem {
    playerId: string;
    name: string;
    amount: number;
}

/**
 * Top player bounty hunter in the world. Based on how many pirates they have killed. Players who kill a ship of a faction
 * will be placed on a bounty list for 30 minutes. Killing a player on the bounty list will give a bounty reward and
 * increase this score.
 *
 * Medium, killing a ship of an empire will put you on their bounty list for 30 minutes, killing a pirate will give bounty.
 */
export interface IScoreBoardBountyItem {
    playerId: string;
    name: string;
    bountyAmount: number;
}

/**
 * Top player captain in the world. Based on how many planets they have captured during an invasion. Signing up for
 * an invasion at a planet then killing all ships in an area and capturing a planet will reward 1 point.
 *
 * Difficult, an invasion is a faction event which players can opt into that will allow the capturing of enemy planets.
 * 1. Kill all enemy ships,
 * 2. Sit on planet for 5 minutes and wait for counter invasion.
 */
export interface IScoreBoardCaptureItem {
    playerId: string;
    name: string;
    count: number;
}

/**
 * The game will have a score board to encourage players to keep playing.
 */
export interface IScoreBoard {
    damage: IScoreBoardDamageItem[];
    loot: IScoreBoardLootItem[];
    money: IScoreBoardMoneyItem[];
    land: IScoreBoardLandItem[];
    bounty: IScoreBoardBountyItem[];
    capture: IScoreBoardCaptureItem[];
}

export interface IExpirableTicks {
    life: number;
    maxLife: number;
}

export enum EAutomatedShipBuffType {
    DISABLED = "DISABLED"
}

export interface IAutomatedShipBuff {
    buffType: EAutomatedShipBuffType;
    expireTicks: number;
}

export interface IAutomatedShip extends ICameraState {
    activeKeys: string[];
    buffs: IAutomatedShipBuff[];
    app: Game;

    isInMissionArea(): boolean;

    hasPirateOrder(): boolean;

    nearPirateCrate(): Crate | null;

    hasPirateCargo(): boolean;

    getSpeedFactor(): number;

    getVelocityAcceleration(): number;
    getVelocitySpeed(): number;
    getRotation(): number;
}

export interface ICollidable extends ICameraState {
    size: number;
    factionId: EFaction | null;
}

export interface ICameraState {
    /**
     * The id of the camera.
     */
    id: string;
    /**
     * Position, relative to north pole.
     */
    position: Quaternion;
    /**
     * Position velocity, in north pole reference frame.
     */
    positionVelocity: Quaternion;
    /**
     * Orientation, in north pole reference frame.
     */
    orientation: Quaternion;
    /**
     * Orientation velocity, in north pole reference frame.
     */
    orientationVelocity: Quaternion;
    /**
     * The color of the camera object.
     */
    color: string;
    /**
     * The start of cannon loading.
     */
    cannonLoading?: Date;
    /**
     * The pathfinding component of the drawable.
     */
    pathFinding?: PathFinder<any>;
    /**
     * The size of the object.
     */
    size?: number;
    /**
     * The speed factor of the object.
     */
    getSpeedFactor?(): number;
}

/**
 * A combined camera state with original data, for rendering.
 */
export interface ICameraStateWithOriginal<T extends ICameraState> extends ICameraState {
    original: T;
}

export interface IExpirable {
    /**
     * The date an expirable object was created.
     */
    created: Date;
    /**
     * The date an expirable object will be destroyed.
     */
    expires: Date;
}

export interface IDrawable<T extends ICameraState> {
    id: string;
    color: string;
    position: Quaternion;
    positionVelocity: Quaternion;
    orientation: Quaternion;
    orientationVelocity: Quaternion;
    original: T
    projection: { x: number, y: number };
    reverseProjection: { x: number, y: number };
    rotatedPosition: [number, number, number];
    rotation: number;
    distance: number;
} /**
 * The level of settlement of a world.
 */
/**
 * The min distance in rendering to prevent disappearing ship bug.
 */
export const MIN_DISTANCE = 1 / 10;

export enum ESettlementLevel {
    /**
     * The world does not have any faction on it.
     */
    UNTAMED = 0,
    /**
     * The world is a small outpost which can repair ships and produce luxuries such as fur. But it cannot produce
     * ships. Ship production is too complicated for an outpost. This planet has no government.
     */
    OUTPOST = 1,
    /**
     * The world is larger and can repair ships and also produce small ships. It is able to engage in manufacturing,
     * producing more complicated goods. This planet has a small government, either a republic or a governor. Colonies
     * will send taxes with a trade ship back to the capital so the capital can issue more orders.
     */
    COLONY = 2,
    /**
     * The world is larger and can repair ships and also produce medium ships. It is able to produce complicated goods
     * and is considered a core part of the faction. This world is able to issue it's own orders to it's own local fleet,
     * similar to a capital but the capital will always override the territory. Capitals can issue general economic orders
     * to territories.
     */
    TERRITORY = 3,
    /**
     * This world is a core part of the faction and contains lots of manufacturing and investments. It is able to produce
     * large ships. Provinces can issue it's own orders to it's local fleet similar to a capital but the capital will always
     * override the province. Capitals can issue general economic orders to provinces. Provinces can issue general
     * economic orders to territories.
     */
    PROVINCE = 4,
    /**
     * This world is the capital of the faction. It is able to produce the largest ships. All orders come from the capital.
     * If the capital is captured, another province or territory can become a second capital to replace the original capital.
     */
    CAPITAL = 5,
}

/**
 * A list of planets to explore, used internally by the faction.
 */
export interface IExplorationGraphData {
    distance: number;
    invaderShipIds: string[];
    settlerShipIds: string[];
    traderShipIds: string[];
    pirateShipIds: string[];
    enemyStrength: number;
    planet: Planet;
}

/**
 * Serialized data for exploration graph.
 */
export interface ISerializedExplorationGraphData {
    distance: number;
    invaderShipIds: string[];
    settlerShipIds: string[];
    traderShipIds: string[];
    pirateShipIds: string[];
    enemyStrength: number;
    planetId: string;
}

export enum EDirectedMarketTradeDirection {
    TO = "TO",
    FROM = "FROM",
}

/**
 * A graph edge used to compute bilateral trade deals. This edge points in one direction. If there are two edges
 * pointing in opposite direction, there can be a trade deal. An example is if it is 100 dollars to buy something at A
 * and 200 dollars to sell at B, also 2 dollars to buy at B and 5 dollars to sell at A. It is possible then to sail
 * between A and B and make money.
 */
export interface IDirectedMarketTrade {
    tradeDirection: EDirectedMarketTradeDirection;
    resourceType: EResourceType;
    profit: number;
}

/**
 * A trade deal between two planets.
 */
export interface ITradeDeal {
    toResourceType: EResourceType;
    fromResourceType: EResourceType;
    profit: number;
    planet: Planet;
}