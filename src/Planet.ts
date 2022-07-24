import {
    EFormEmitterType,
    EFormFieldType,
    EServerType,
    ESettlementLevel,
    EShardMessageType,
    ICameraState,
    IClaimPlanetShardMessage,
    ICreateShipFactionShardMessage,
    IDestroyShipPlanetShardMessage,
    IExpirableTicks,
    IExplorationGraphData,
    IFormCard,
    IFormRequest,
    ILootScoreShardMessage,
    ISerializedExplorationGraphData,
    ISpawnAiShardMessage,
    ITradeDeal,
    ITradeShipPlanetShardMessage,
    ITributeShipPlanetShardMessage
} from "./Interface";
import Quaternion from "quaternion";
import {DelaunayGraph, ISerializedPathingNode, PathingNode, VoronoiGraph} from "./Graph";
import {
    CAPITAL_GOODS,
    EResourceType,
    ICargoItem,
    IItemRecipe,
    ITEM_RECIPES,
    NATURAL_RESOURCES,
    OUTPOST_GOODS
} from "./Resource";
import {Ship} from "./Ship";
import {FeudalGovernment, ISerializedFeudalGovernment, VoronoiCounty} from "./VoronoiTree";
import {ERoyalRank, Faction, LuxuryBuff} from "./Faction";
import {EOrderType, Order} from "./Order";
import {EMessageType, ESoundEventType, ESoundType, Game, IClaimPlanetMessage} from "./Game";
import {DeserializeQuaternion, ISerializedQuaternion, SerializeQuaternion} from "./Item";
import {
    Blacksmith,
    Building,
    EBuildingType,
    Forestry,
    ISerializedBuilding,
    Manufactory,
    Mine,
    PlanetaryMoneyAccount,
    Plantation,
    Shipyard
} from "./Building";
import {ISerializedPlanetaryCurrencySystem, PlanetaryCurrencySystem} from "./PlanetaryCurrencySystem";
import {ISerializedPlanetaryMoneyAccount} from "./PlanetaryEconomyDemand";
import {ISerializedPlanetaryEconomySystem, PlanetaryEconomySystem} from "./PlanetaryEconomySystem";
import * as faker from "faker";
import {DEFAULT_FACTION_PROPERTIES} from "./FactionProperties";
import {EShipType, GetShipData} from "./ShipType";
import {EInvasionCaptureState, EInvasionPhase, Invasion} from "./Invasion";
import {EFaction} from "./EFaction";
import {ICurrency, MoneyAccount} from "./MoneyAccount";

export enum EPlanetFormActions {
    ENTER_PORT = "PlanetPortEnter",
    REPAIR = "PlanetRepairRepair",
    DEPOSIT = "PlanetBankingDeposit",
    WITHDRAW = "PlanetBankingWithdraw",
    INVEST = "PlanetInvestmentInvest",
    RETURN = "PlanetInvestmentReturn",
    OWNERSHIP_SALE = "PlanetOwnershipSale",
    OWNERSHIP_SALE_CANCEL = "PlanetOwnershipSaleCancel",
    OWNERSHIP_BID = "PlanetOwnershipBid",
}

export enum EPlanetOwnershipStage {
    OWNED = "Owned",
    BEGIN_AUCTION = "BeginAuction",
    ACTIVE_AUCTION = "ActiveAuction",
}

export interface IResourceExported {
    resourceType: EResourceType;
    amount: number;
    feudalObligation: boolean;
}

export interface IResourceProduced extends IItemRecipe {
    amount: number;
}

export interface IInvasionTick extends IExpirableTicks {

}


export interface ISerializedPlanet {
    id: string;
    position: ISerializedQuaternion;
    positionVelocity: ISerializedQuaternion;
    orientation: ISerializedQuaternion;
    orientationVelocity: ISerializedQuaternion;
    color: string;
    size: number;
    name: string;

    settlementProgress: number;
    settlementLevel: ESettlementLevel;
    faction: EFaction | null;
    royalRank: ERoyalRank;

    pathingNode: ISerializedPathingNode<DelaunayGraph<Planet>> | null;

    naturalResources: EResourceType[];
}

export interface ISerializedPlanetFull {
    id: string;
    position: ISerializedQuaternion;
    positionVelocity: ISerializedQuaternion;
    orientation: ISerializedQuaternion;
    orientationVelocity: ISerializedQuaternion;
    color: string;
    size: number;
    name: string;

    settlementProgress: number;
    settlementLevel: ESettlementLevel;
    faction: EFaction | null;
    royalRank: ERoyalRank;

    pathingNode: ISerializedPathingNode<DelaunayGraph<Planet>> | null;

    naturalResources: EResourceType[];
    producedResources: IResourceExported[];
    importedResources: ICargoItem[];
    manufacturedResources: IResourceProduced[];
    resources: Array<IResourceExported>;
    marketResources: Array<IResourceExported>;
    feudalObligationResources: Array<IResourceExported>;
    feudalObligationResourceCycle: number;
    bestProfitableTrades: Array<[EResourceType, number, Planet]>;
    possibleTradeDeals: Array<ITradeDeal>;
    registeredTradeDeals: Array<ITradeDeal>;
    registeredMarketResources: Array<[Ship, IResourceExported]>;
    availableMarketResources: Array<IResourceExported>;

    wood: number;
    woodConstruction: number;
    iron: number;
    ironConstruction: number;
    coal: number;
    coalConstruction: number;
    cannons: number;
    cannonades: number;

    feudalGovernment: ISerializedFeudalGovernment;
    economySystem: ISerializedPlanetaryEconomySystem;
    currencySystem: ISerializedPlanetaryCurrencySystem;
    moneyAccount: ISerializedPlanetaryMoneyAccount;

    buildings: ISerializedBuilding[];

    investmentAccounts: [string, IInvestmentAccount][];

    explorationGraph: Record<string, ISerializedExplorationGraphData>;

    ownershipStage: EPlanetOwnershipStage;
}

export interface IBankAccount {
    playerId: string;
    balance: number;
}

export interface IInvestmentAccountLot {
    amount: number;
    ticksRemaining: number;
    maturityTicks: number;
    matureAmount: number;
}

export interface IInvestmentAccount {
    playerId: string;
    lots: IInvestmentAccountLot[];
}

export class Planet implements ICameraState {
    public instance: Game;

    // planet properties
    public id: string = "";
    public position: Quaternion = Quaternion.ONE;
    public positionVelocity: Quaternion = Quaternion.ONE;
    public orientation: Quaternion = Quaternion.ONE;
    public orientationVelocity: Quaternion = Quaternion.ONE;
    public color: string = "blue";
    public size: number = 3;
    public name: string;

    // population properties
    public settlementProgress: number = 0;
    public settlementLevel: ESettlementLevel = ESettlementLevel.UNTAMED;

    // ai pathing
    public pathingNode: PathingNode<DelaunayGraph<Planet>> | null = null;

    // feudal hierarchy
    public county: VoronoiCounty;

    // resource properties
    // the resources the island can produce
    public naturalResources: EResourceType[];
    // the resources the island produces from its plantations
    public producedResources: IResourceExported[] = [];
    // the resources the island imports from trading
    public importedResources: ICargoItem[] = [];
    // the resources the island manufactures, it removes raw material and adds refined product
    public manufacturedResources: IResourceProduced[] = [];
    // the resources which are exported from the island, not the final output
    public resources: Array<IResourceExported> = [];
    // the resources which are reserved for market use, paid in gold or cash
    public marketResources: Array<IResourceExported> = [];
    // the resources which are reserved for the feudal lord, free of charge
    public feudalObligationResources: Array<IResourceExported> = [];
    // used to cycle through exports for feudal obligation resources since those are free of charge
    private feudalObligationResourceCycle: number = 0;
    // used to determine free market trade, a list of directed trade routes, a pair of trade routes will allow a ship
    // to take both directions of the trade route
    public bestProfitableTrades: Array<[EResourceType, number, Planet]> = [];
    // a list of possible trade deals
    public possibleTradeDeals: Array<ITradeDeal> = [];
    // a list of registered trade deals
    public registeredTradeDeals: Array<ITradeDeal> = [];
    // a list of market resources which are owned by something
    public registeredMarketResources: Array<[Ship, IResourceExported]> = [];
    // a list of available market resources for trading
    public availableMarketResources: Array<IResourceExported> = [];

    // construction and ship building properties
    // the amount of wood available to build ships
    public wood: number = 0;
    // the amount of wood available to build buildings
    public woodConstruction: number = 0;
    // the amount of iron available to build ships
    public iron: number = 0;
    // the amount of iron available to build buildings
    public ironConstruction: number = 0;
    // the amount of coal available to build ships
    public coal: number = 0;
    // the amount of coal available to build buildings
    public coalConstruction: number = 0;
    // the number of cannons for building ships
    public cannons: number = 0;
    // the number of cannonades for building ships
    public cannonades: number = 0;

    // government and economy properties
    // the feudal government of the planet
    public feudalGovernment: FeudalGovernment | null = null;
    // economy of the planet
    public economySystem: PlanetaryEconomySystem | null = null;
    // currency of the planet
    public currencySystem: PlanetaryCurrencySystem | null = null;
    // money account keeping track of money
    public moneyAccount: PlanetaryMoneyAccount | null = null;

    // trade screens
    public tradeScreens: Map<string, {isTrading: boolean}> = new Map<string, {isTrading: boolean}>();

    public ownershipStage: EPlanetOwnershipStage = EPlanetOwnershipStage.OWNED;
    public ownershipAuctionBid: {playerId: string, amount: number, playerIds: string[]} | null = null;
    public ownershipAuctionTick: number = 60 * 10;
    public ownershipAuctionResultTick: number = 0;

    // real estate properties, used to manufacture stuff
    // a building which builds ships
    public get shipyard(): Shipyard {
        const shipyard = this.buildings.find((b): b is Shipyard => b.buildingType === EBuildingType.SHIPYARD);
        if (shipyard) {
            return shipyard;
        } else {
            throw new Error("Missing Shipyard");
        }
    }
    // a building which chops down trees for wood
    public get forestry(): Forestry {
        const forestry = this.buildings.find((b): b is Forestry => b.buildingType === EBuildingType.FORESTRY);
        if (forestry) {
            return forestry;
        } else {
            throw new Error("Missing Forestry");
        }
    }
    // a building which mines iron, coal, gems, and marble
    public get mine(): Mine {
        const mine = this.buildings.find((b): b is Mine => b.buildingType === EBuildingType.MINE);
        if (mine) {
            return mine;
        } else {
            throw new Error("Missing Mine");
        }
    }
    // a building which produces weapons and tools
    public get blacksmith(): Blacksmith {
        const blacksmith = this.buildings.find((b): b is Blacksmith => b.buildingType === EBuildingType.BLACKSMITH);
        if (blacksmith) {
            return blacksmith;
        } else {
            throw new Error("Missing Blacksmith");
        }
    }
    // a list of buildings to upgrade
    public buildings: Building[];

    // property used to initialize buildings and compound investment accounts
    private numTicks: number = 0;

    // players can open an investment account on the planet to generate passive income.
    public bankAccounts: Map<string, IBankAccount> = new Map<string, IBankAccount>();
    public investmentAccounts: Map<string, IInvestmentAccount> = new Map<string, IInvestmentAccount>();

    /**
     * The list of planet priorities for exploration.
     * @private
     */
    public explorationGraph: Record<string, IExplorationGraphData> = {};
    public enemyPresenceTick: number = 10 * 30;
    /**
     * A list of luxuryBuffs which improves the faction.
     */
    public luxuryBuffs: LuxuryBuff[] = [];
    /**
     * A list of ship ids owned by this faction.
     */
    public shipIds: string[] = [];
    public shipsAvailable: Record<EShipType, number> = {
        [EShipType.CUTTER]: 0,
        [EShipType.SLOOP]: 0,
        [EShipType.CORVETTE]: 0,
        [EShipType.BRIGANTINE]: 0,
        [EShipType.BRIG]: 0,
        [EShipType.FRIGATE]: 0,
        [EShipType.GALLEON]: 0,
    };
    public numPirateSlots: number = 0;
    public pirateSlots: string[] = [];
    public shipDemandTickCoolDown: number = 0;
    public shipsDemand: Record<EShipType, number> = {
        [EShipType.CUTTER]: 0,
        [EShipType.SLOOP]: 0,
        [EShipType.CORVETTE]: 0,
        [EShipType.BRIGANTINE]: 0,
        [EShipType.BRIG]: 0,
        [EShipType.FRIGATE]: 0,
        [EShipType.GALLEON]: 0,
    };
    public invasionDemand: Map<string, IInvasionTick[]> = new Map<string, IInvasionTick[]>();

    /**
     * Number of settlements to colonize a planet.
     */
    public static NUM_SETTLEMENT_PROGRESS_STEPS = 4;
    public static ENEMY_PRESENCE_TICK_COOL_DOWN: number = 10 * 30;
    public static SHIP_DEMAND_TICK_COOL_DOWN: number = 30 * 10;

    /**
     * Get the number of ships available.
     */
    public getNumShipsAvailable(shipType: EShipType): number {
        return this.shipyard.shipsAvailable[shipType];
    }

    public allowedToSpawn() {
        return !(this.instance.invasions.get(this.id) && this.instance.invasions.get(this.id).planetSpawnAllowed === false);
    }

    public serialize(): ISerializedPlanet {
        return {
            id: this.id,
            position: SerializeQuaternion(this.position),
            positionVelocity: SerializeQuaternion(this.positionVelocity),
            orientation: SerializeQuaternion(this.orientation),
            orientationVelocity: SerializeQuaternion(this.orientationVelocity),
            color: this.color,
            size: this.size,
            name: this.name,

            settlementProgress: this.settlementProgress,
            settlementLevel: this.settlementLevel,
            faction: this.county.faction?.id ?? null,
            royalRank: this.getRoyalRank(),

            pathingNode: this.pathingNode ? this.pathingNode.serialize() : null,

            naturalResources: this.naturalResources,
        };
    }

    public deserializeUpdate(data: ISerializedPlanet) {
        this.id = data.id;
        this.position = DeserializeQuaternion(data.position);
        this.positionVelocity = DeserializeQuaternion(data.positionVelocity);
        this.orientation = DeserializeQuaternion(data.orientation);
        this.orientationVelocity = DeserializeQuaternion(data.orientationVelocity);
        this.color = data.color;
        this.size = data.size;
        this.name = data.name;

        this.settlementProgress = data.settlementProgress;
        this.settlementLevel = data.settlementLevel;
        if (data.faction) {
            this.county.claim(this.instance.factions.get(data.faction));
        }
        switch (data.royalRank) {
            case ERoyalRank.EMPEROR: {
                this.county.capital = this;
                this.county.duchy.capital = this.county;
                this.county.duchy.kingdom.capital = this.county.duchy;
                this.county.duchy.kingdom.faction.homeWorldPlanetId = this.id;
                break;
            }
            case ERoyalRank.KING: {
                this.county.capital = this;
                this.county.duchy.capital = this.county;
                this.county.duchy.kingdom.capital = this.county.duchy;
                break;
            }
            case ERoyalRank.DUKE: {
                this.county.capital = this;
                this.county.duchy.capital = this.county;
                break;
            }
            case ERoyalRank.COUNT: {
                this.county.capital = this;
                break;
            }
            case ERoyalRank.UNCLAIMED: {
                break;
            }
        }

        if (this.pathingNode && !data.pathingNode) {
            this.pathingNode = null;
        } else if (this.pathingNode && data.pathingNode) {
            this.pathingNode.deserializeUpdate(data.pathingNode);
        } else if (!this.pathingNode && data.pathingNode) {
            this.pathingNode = PathingNode.deserialize<any>(this.instance, data.pathingNode);
        }

        this.naturalResources = data.naturalResources;
    }

    public static deserialize(instance: Game, county: VoronoiCounty, data: ISerializedPlanet): Planet {
        const item = new Planet(instance, county);
        item.deserializeUpdate(data);
        return item;
    }

    public serializeFull(): ISerializedPlanetFull {
        return {
            id: this.id,
            position: SerializeQuaternion(this.position),
            positionVelocity: SerializeQuaternion(this.positionVelocity),
            orientation: SerializeQuaternion(this.orientation),
            orientationVelocity: SerializeQuaternion(this.orientationVelocity),
            color: this.color,
            size: this.size,
            name: this.name,

            settlementProgress: this.settlementProgress,
            settlementLevel: this.settlementLevel,
            faction: this.county.faction?.id ?? null,
            royalRank: this.getRoyalRank(),

            pathingNode: this.pathingNode ? this.pathingNode.serialize() : null,

            naturalResources: this.naturalResources,
            producedResources: this.producedResources,
            importedResources: this.importedResources,
            manufacturedResources: this.manufacturedResources,
            resources: this.resources,
            marketResources: this.marketResources,
            feudalObligationResources: this.feudalObligationResources,
            feudalObligationResourceCycle: this.feudalObligationResourceCycle,
            bestProfitableTrades: this.bestProfitableTrades,
            possibleTradeDeals: this.possibleTradeDeals,
            registeredTradeDeals: this.registeredTradeDeals,
            registeredMarketResources: this.registeredMarketResources,
            availableMarketResources: this.availableMarketResources,

            wood: this.wood,
            woodConstruction: this.woodConstruction,
            iron: this.iron,
            ironConstruction: this.ironConstruction,
            coal: this.coal,
            coalConstruction: this.coalConstruction,
            cannons: this.cannons,
            cannonades: this.cannonades,

            feudalGovernment: this.feudalGovernment ? this.feudalGovernment.serialize() : null,
            economySystem: this.economySystem ? this.economySystem.serialize() : null,
            currencySystem: this.currencySystem ? this.currencySystem.serialize() : null,
            moneyAccount: this.moneyAccount ? this.moneyAccount.serialize() : null,

            buildings: this.buildings.map(b => b.serialize()),

            investmentAccounts: [...this.investmentAccounts.entries()],

            explorationGraph: Object.assign({}, ...Object.entries(this.explorationGraph).map(([key, value]): {[key: string]: ISerializedExplorationGraphData} => ({[key]: {
                distance: value.distance,
                invaderShipIds: value.invaderShipIds,
                settlerShipIds: value.settlerShipIds,
                traderShipIds: value.traderShipIds,
                pirateShipIds: value.pirateShipIds,
                enemyStrength: value.enemyStrength,
                planetId: value.planet?.id,
            }})).filter(item => !!item.planetId)),

            ownershipStage: this.ownershipStage,
        };
    }

    public deserializeUpdateFull(data: ISerializedPlanetFull) {
        this.id = data.id;
        this.position = DeserializeQuaternion(data.position);
        this.positionVelocity = DeserializeQuaternion(data.positionVelocity);
        this.orientation = DeserializeQuaternion(data.orientation);
        this.orientationVelocity = DeserializeQuaternion(data.orientationVelocity);
        this.color = data.color;
        this.size = data.size;
        this.name = data.name;

        this.settlementProgress = data.settlementProgress;
        this.settlementLevel = data.settlementLevel;
        if (data.faction) {
            this.county.claim(this.instance.factions.get(data.faction));
        }
        switch (data.royalRank) {
            case ERoyalRank.EMPEROR: {
                this.county.capital = this;
                this.county.duchy.capital = this.county;
                this.county.duchy.kingdom.capital = this.county.duchy;
                this.county.duchy.kingdom.faction.homeWorldPlanetId = this.id;
                break;
            }
            case ERoyalRank.KING: {
                this.county.capital = this;
                this.county.duchy.capital = this.county;
                this.county.duchy.kingdom.capital = this.county.duchy;
                break;
            }
            case ERoyalRank.DUKE: {
                this.county.capital = this;
                this.county.duchy.capital = this.county;
                break;
            }
            case ERoyalRank.COUNT: {
                this.county.capital = this;
                break;
            }
            case ERoyalRank.UNCLAIMED: {
                break;
            }
        }

        if (this.pathingNode && !data.pathingNode) {
            this.pathingNode = null;
        } else if (this.pathingNode && data.pathingNode) {
            this.pathingNode.deserializeUpdate(data.pathingNode);
        } else if (!this.pathingNode && data.pathingNode) {
            this.pathingNode = PathingNode.deserialize<any>(this.instance, data.pathingNode);
        }

        this.naturalResources = data.naturalResources;
        this.producedResources = data.producedResources;
        this.importedResources = data.importedResources;
        this.manufacturedResources = data.manufacturedResources;
        this.resources = data.resources;
        this.marketResources = data.marketResources;
        this.feudalObligationResources = data.feudalObligationResources;
        this.feudalObligationResourceCycle = data.feudalObligationResourceCycle;
        this.bestProfitableTrades = data.bestProfitableTrades;
        this.possibleTradeDeals = data.possibleTradeDeals;
        this.registeredTradeDeals = data.registeredTradeDeals;
        this.registeredMarketResources = data.registeredMarketResources;
        this.availableMarketResources = data.availableMarketResources;

        this.wood = data.wood;
        this.woodConstruction = data.woodConstruction;
        this.iron = data.iron;
        this.ironConstruction = data.ironConstruction;
        this.coal = data.coal;
        this.coalConstruction = data.coalConstruction;
        this.cannons = data.cannons;
        this.cannonades = data.cannonades;

        if (this.feudalGovernment && !data.feudalGovernment) {
            this.feudalGovernment = null;
        } else if (this.feudalGovernment && data.feudalGovernment) {
            this.feudalGovernment.deserializeUpdate(data.feudalGovernment);
        } else if (!this.feudalGovernment && data.feudalGovernment) {
            this.feudalGovernment = FeudalGovernment.deserialize(this, data.feudalGovernment);
        }
        if (this.economySystem && !data.economySystem) {
            this.economySystem = null;
        } else if (this.economySystem && data.economySystem) {
            this.economySystem.deserializeUpdate(data.economySystem);
        } else if (!this.economySystem && data.economySystem) {
            this.economySystem = PlanetaryEconomySystem.deserialize(this.instance, data.economySystem);
        }
        if (this.currencySystem && !data.currencySystem) {
            this.currencySystem = null;
        } else if (this.currencySystem && data.currencySystem) {
            this.currencySystem.deserializeUpdate(data.currencySystem);
        } else if (!this.currencySystem && data.currencySystem) {
            this.currencySystem = PlanetaryCurrencySystem.deserialize(data.currencySystem);
        }
        if (this.moneyAccount && !data.moneyAccount) {
            this.moneyAccount = null;
        } else if (this.moneyAccount && data.moneyAccount) {
            this.moneyAccount.deserializeUpdate(data.moneyAccount);
        } else if (!this.moneyAccount && data.moneyAccount) {
            this.moneyAccount = PlanetaryMoneyAccount.deserialize(this.instance, this, data.moneyAccount);
        }

        if (this.buildings.length === data.buildings.length) {
            this.buildings.forEach((b, i) => b.deserializeUpdate(data.buildings[i]));
        } else {
            this.buildings = data.buildings.map(b => Building.deserializeBuilding(this.instance, this, b));
        }

        this.investmentAccounts = new Map<string, IInvestmentAccount>(data.investmentAccounts);

        this.explorationGraph = Object.assign({}, ...Object.entries(data.explorationGraph).map(([key, value]): {[key: string]: IExplorationGraphData} => ({[key]: {
            distance: value.distance,
            invaderShipIds: value.invaderShipIds,
            settlerShipIds: value.settlerShipIds,
            traderShipIds: value.traderShipIds,
            pirateShipIds: value.pirateShipIds,
            enemyStrength: value.enemyStrength,
            planet: this.instance.planets.get(value.planetId)
        }})));

        this.ownershipStage = data.ownershipStage;
    }

    public static deserializeFull(instance: Game, county: VoronoiCounty, data: ISerializedPlanetFull): Planet {
        const item = new Planet(instance, county);
        item.deserializeUpdateFull(data);
        return item;
    }

    constructor(instance: Game, county: VoronoiCounty) {
        this.instance = instance;
        this.county = county;

        // initialize name
        this.name = faker.address.cityName();

        // initialize the natural resources
        this.naturalResources = [];
        const numResources = Math.floor(Math.random() * 2 + 1);
        const resourceValues = Object.values(NATURAL_RESOURCES);
        for (let i = 0; i < 100 && this.naturalResources.length < numResources; i++) {
            const randomResource = resourceValues[Math.floor(Math.random() * resourceValues.length)];
            if (!this.naturalResources.includes(randomResource)) {
                this.naturalResources.push(randomResource);
            }
        }

        // initialize buildings
        this.buildings = [
            new Shipyard(this.instance, this),
            new Forestry(this.instance, this),
            new Mine(this.instance, this),
            new Blacksmith(this.instance, this)
        ];
    }

    public claim(faction: Faction, shouldNetwork: boolean, ship: Ship | null) {
        if (shouldNetwork) {
            if ([EServerType.AI_NODE, EServerType.PHYSICS_NODE].includes(this.instance.serverType)) {
                const claimMessage: IClaimPlanetShardMessage = {
                    shardMessageType: EShardMessageType.CLAIM_PLANET,
                    factionId: faction.id,
                    planetId: this.id,
                    fromShard: this.instance.shardName
                };
                const loadBalancerShard = Array.from(this.instance.shardList.values()).find(s => s.type === EServerType.LOAD_BALANCER);
                this.instance.outgoingShardMessages.push([loadBalancerShard.name, claimMessage]);
            }
        }

        for (const [, playerData] of this.instance.playerData) {
            const claimMessage: IClaimPlanetMessage = {
                messageType: EMessageType.CLAIM_PLANET,
                planetId: this.id,
                factionId: faction.id,
            };
            this.instance.outgoingMessages.push([playerData.id, claimMessage]);
        }

        this.county.claim(faction);

        if (ship) {
            const payment = {currencyId: "GOLD", amount: 1000};
            ship.moneyAccount.addMoney(payment);
            const playerData = Array.from(this.instance.playerData.values()).find(x => x.shipId == ship.id);
            if (playerData) {
                playerData.moneyAccount.addMoney(payment)
            }
            this.instance.soundEvents.push({
                shipId: ship.id,
                soundType: ESoundType.LAND,
                soundEventType: ESoundEventType.ONE_OFF
            });
        }

        // build exploration graph for which planets to explore and in what order
        this.buildExplorationGraph();

        this.feudalGovernment = new FeudalGovernment(this.findFeudalLord.bind(this));

        // remove the previous economic system
        if (this.economySystem) {
            this.economySystem.removePlanet(this);
            this.economySystem = null;
        }

        const factionProperty = DEFAULT_FACTION_PROPERTIES[faction.id];

        switch (this.getRoyalRank()) {
            case ERoyalRank.EMPEROR: {
                // emperors have more pirates and their own economy
                this.numPirateSlots = 5 * factionProperty.piracyMultiple;
                this.economySystem = new PlanetaryEconomySystem(this.instance);
                this.economySystem.addPlanet(this);
                this.currencySystem = new PlanetaryCurrencySystem(`${faction.id} Bucks`);
                break;
            }
            case ERoyalRank.KING: {
                // kings have some pirates and their own economy
                this.numPirateSlots = 3 * factionProperty.piracyMultiple;
                this.economySystem = new PlanetaryEconomySystem(this.instance);
                this.economySystem.addPlanet(this);
                this.currencySystem = new PlanetaryCurrencySystem(`${faction.id} Bucks - ${Math.floor(Math.random() * 1000)}`);
                break;
            }
            case ERoyalRank.DUKE: {
                // dukes have few pirates and barrow their lords' currency, but have their own economy
                this.numPirateSlots = factionProperty.piracyMultiple;

                const lordPlanet = this.getLordWorld();
                if (!lordPlanet.currencySystem) {
                    throw new Error("Couldn't find currency system to copy from king to duke");
                }
                this.economySystem = new PlanetaryEconomySystem(this.instance);
                this.economySystem.addPlanet(this);
                this.currencySystem = lordPlanet.currencySystem;
                break;
            }
            case ERoyalRank.COUNT: {
                // counts do not have pirates, they also copy their lords economy and currency
                this.numPirateSlots = 0;

                const lordPlanet = this.getLordWorld();
                if (!lordPlanet.economySystem) {
                    throw new Error("Couldn't find economy system to copy from king to duke");
                }
                if (!lordPlanet.currencySystem) {
                    throw new Error("Couldn't find currency system to copy from king to duke");
                }
                this.economySystem = lordPlanet.economySystem;
                this.economySystem.addPlanet(this);
                this.currencySystem = lordPlanet.currencySystem;
                break;
            }
            default: {
                // everything else does not have pirates for now
                this.numPirateSlots = 0;
                break;
            }
        }

        if (this.currencySystem && this.economySystem) {
            this.moneyAccount = new PlanetaryMoneyAccount(this, this.currencySystem, this.economySystem);
        }
    }

    /**
     * Build a map of the world from the faction's point of view.
     */
    buildExplorationGraph() {
        const homeWorld = this;
        if (homeWorld) {
            for (const [, planet] of this.instance.planets) {
                if (planet.pathingNode && homeWorld.pathingNode && planet.id !== homeWorld.id) {
                    const path = homeWorld.pathingNode.pathToObject(planet.pathingNode);
                    if (path.length === 0) {
                        throw new Error("Found 0 length path, could not build AI map to world");
                    }
                    const distance = path.slice(-1).reduce((acc: {
                        lastPosition: [number, number, number],
                        totalDistance: number
                    }, vertex) => {
                        // detect duplicate point, or the same point twice.
                        if (DelaunayGraph.distanceFormula(acc.lastPosition, vertex) < 0.00001) {
                            return {
                                lastPosition: vertex,
                                totalDistance: acc.totalDistance
                            };
                        }

                        const segmentDistance = VoronoiGraph.angularDistance(acc.lastPosition, vertex, this.instance.worldScale);
                        return {
                            lastPosition: vertex,
                            totalDistance: acc.totalDistance + segmentDistance
                        };
                    }, {
                        lastPosition: homeWorld.position.rotateVector([0, 0, 1]),
                        totalDistance: 0
                    }).totalDistance;

                    this.explorationGraph[planet.id] = {
                        distance,
                        invaderShipIds: [],
                        settlerShipIds: [],
                        traderShipIds: [],
                        pirateShipIds: [],
                        enemyStrength: 0,
                        planet
                    };
                }
            }
        }
    }

    /**
     * Compute a list of possible tasks for the planet's fleet to perform.
     */
    public getPlanetExplorationEntries(shipType?: EShipType) {
        // sort by importance
        const entries = Object.entries(this.explorationGraph)
            .sort((a, b) => {
                // check for lords domain or the lords' duchy
                // dukes and kings should prioritize their local duchy
                const aIsDuchyDomain = this.isDuchyDomain(a[1].planet);
                const bIsDuchyDomain = this.isDuchyDomain(b[1].planet);
                if (aIsDuchyDomain && !bIsDuchyDomain) {
                    return -1;
                } else if (!aIsDuchyDomain && bIsDuchyDomain) {
                    return 1;
                }
                const isKing = (
                    this.getRoyalRank() === ERoyalRank.EMPEROR ||
                    this.getRoyalRank() === ERoyalRank.KING
                );
                if (isKing) {
                    // kings should prioritize new duchy capitals for their vassal dukes.
                    const aIsUnclaimedDuchyOfKingdom = this.isUnclaimedSisterDuchyOfKingdom(a[1].planet);
                    const bIsUnclaimedDuchyOfKingdom = this.isUnclaimedSisterDuchyOfKingdom(b[1].planet);
                    if (aIsUnclaimedDuchyOfKingdom && !bIsUnclaimedDuchyOfKingdom) {
                        return -1;
                    } else if (!aIsUnclaimedDuchyOfKingdom && bIsUnclaimedDuchyOfKingdom) {
                        return 1;
                    }
                }
                // prioritize the remaining counties in kingdom
                const aIsKingdomDomain = this.isKingdomDomain(a[1].planet);
                const bIsKingdomDomain = this.isKingdomDomain(b[1].planet);
                if (aIsKingdomDomain && !bIsKingdomDomain) {
                    return -1;
                } else if (!aIsKingdomDomain && bIsKingdomDomain) {
                    return 1;
                }
                const isEmperor = this.getRoyalRank() === ERoyalRank.EMPEROR;
                if (isEmperor) {
                    // emperors should prioritize new kingdom capitals for their vassal kings.
                    const aIsUnclaimedKingdomOfEmpire = this.isUnclaimedSisterKingdomOfEmpire(a[1].planet);
                    const bIsUnclaimedKingdomOfEmpire = this.isUnclaimedSisterKingdomOfEmpire(b[1].planet);
                    if (aIsUnclaimedKingdomOfEmpire && !bIsUnclaimedKingdomOfEmpire) {
                        return -1;
                    } else if (!aIsUnclaimedKingdomOfEmpire && bIsUnclaimedKingdomOfEmpire) {
                        return 1;
                    }
                }
                // prioritize imperial vassals
                const aIsVassal = this.isVassal(a[1].planet);
                const bIsVassal = this.isVassal(b[1].planet);
                if (aIsVassal && !bIsVassal) {
                    return -1;
                } else if (!aIsVassal && bIsVassal) {
                    return 1;
                }
                // prioritize settlement progress
                const settlementDifference = b[1].planet.settlementProgress - a[1].planet.settlementProgress;
                if (settlementDifference !== 0){
                    return settlementDifference;
                }
                // prioritize unclaimed land
                const aIsUnclaimed = a[1].planet.isUnclaimed();
                const bIsUnclaimed = b[1].planet.isUnclaimed();
                if (aIsUnclaimed && !bIsUnclaimed) {
                    return -1;
                } else if (!aIsUnclaimed && bIsUnclaimed) {
                    return 1;
                }
                // prioritize enemy counties
                const aIsCountyCapital = a[1].planet.isCountyCapital();
                const bIsCountyCapital = b[1].planet.isCountyCapital();
                if (aIsCountyCapital && !bIsCountyCapital) {
                    return -1;
                } else if (!aIsCountyCapital && bIsCountyCapital) {
                    return 1;
                }
                // prioritize enemy duchies
                const aIsDuchyCapital = a[1].planet.isDuchyCapital();
                const bIsDuchyCapital = b[1].planet.isDuchyCapital();
                if (aIsDuchyCapital && !bIsDuchyCapital) {
                    return -1;
                } else if (!aIsDuchyCapital && bIsDuchyCapital) {
                    return 1;
                }
                // prioritize enemy kingdoms
                const aIsKingdomCapital = a[1].planet.isKingdomCapital();
                const bIsKingdomCapital = b[1].planet.isKingdomCapital();
                if (aIsKingdomCapital && !bIsKingdomCapital) {
                    return -1;
                } else if (!aIsKingdomCapital && bIsKingdomCapital) {
                    return 1;
                }

                // rank by distance
                return a[1].distance - b[1].distance;
            });

        const homeFaction = this?.county?.faction;

        // find vassals to help
        const offerVassalEntries = entries.filter(entry => {
            const worldIsAbleToTrade = this.isAbleToTrade(entry[1].planet);
            // the vassal planet does not have enough ships
            const doesNotHaveEnoughShips = shipType &&
                entry[1].planet.shipsAvailable[shipType] < entry[1].planet.shipsDemand[shipType];
            return worldIsAbleToTrade && doesNotHaveEnoughShips;
        });

        // find worlds to pirate
        const pirateWorldEntries = entries.filter(entry => {
            const largeEnoughToPirate = this.isAbleToPirate();
            // settle new worlds which have not been settled yet
            const roomToPirate = entry[1].pirateShipIds.length === 0 && this.pirateSlots.length < this.numPirateSlots;
            const weakEnemyPresence = entry[1].enemyStrength <= 0;
            const isSettledEnoughToTrade = entry[1].planet.settlementLevel >= ESettlementLevel.OUTPOST &&
                entry[1].planet.settlementLevel <= ESettlementLevel.TERRITORY;
            const isOwnedByEnemy = Array.from(this.instance.factions.values()).some(faction => {
                if (homeFaction && entry[1].planet.county.faction && entry[1].planet.county.faction.id === homeFaction.id) {
                    // do not pirate own faction
                    return false;
                } else {
                    // the faction should pirate other factions
                    return faction.planetIds.includes(entry[0]);
                }
            });
            return largeEnoughToPirate && roomToPirate && weakEnemyPresence && isSettledEnoughToTrade && isOwnedByEnemy;
        });

        // find vassals to trade
        const tradeVassalEntries = entries.filter(entry => {
            // settle new worlds which have not been settled yet
            const worldIsAbleToTrade = this.isAbleToTrade(entry[1].planet);
            const roomToTrade = entry[1].traderShipIds.length <= entry[1].planet.feudalObligationResources.length - 1;
            const isSettledEnoughToTrade = entry[1].planet.settlementLevel >= ESettlementLevel.OUTPOST;
            const notTradedYet = Array.from(this.instance.factions.values()).every(faction => {
                if (homeFaction && entry[1].planet.county.faction && entry[1].planet.county.faction.id === homeFaction.id) {
                    // trade with own faction
                    return true;
                } else {
                    // the faction should not colonize another planet colonized by another faction
                    return !faction.planetIds.includes(entry[0]);
                }
            });
            return worldIsAbleToTrade && roomToTrade && isSettledEnoughToTrade && notTradedYet;
        });

        // find neighbors to market trade
        const tradeDealEntries = entries.reduce((acc, entry) => {
            const bestTradeDeal = this.getBestTradeDeal(entry[1].planet);
            if (bestTradeDeal) {
                acc.push([entry, bestTradeDeal]);
            }
            return acc;
        }, [] as Array<[[string, IExplorationGraphData], ITradeDeal]>);

        // find worlds to settle
        const settlementWorldEntries = entries.filter(entry => {
            const worldIsAbleToSettle = this.isAbleToSettle(entry[1].planet);
            // settle new worlds which have not been settled yet
            const roomToSettleMore = entry[1].settlerShipIds.length <=
                Planet.NUM_SETTLEMENT_PROGRESS_STEPS -
                Math.round(entry[1].planet.settlementProgress * Planet.NUM_SETTLEMENT_PROGRESS_STEPS) - 1;
            const notSettledYet = Array.from(this.instance.factions.values()).every(faction => {
                if (homeFaction && homeFaction.planetIds.includes(entry[1].planet.id)) {
                    // settle with own faction
                    return true;
                } else {
                    // the faction should not colonize another planet colonized by another faction
                    return !faction.planetIds.includes(entry[0]);
                }
            });
            return worldIsAbleToSettle && roomToSettleMore && notSettledYet;
        });

        // find worlds to colonize
        const colonizeWorldEntries = entries.filter(entry => {
            // colonize settled worlds by sending more people
            const worldIsAbleToSettle = this.isAbleToSettle(entry[1].planet);
            const roomToSettleMore = entry[1].settlerShipIds.length <=
                Planet.NUM_SETTLEMENT_PROGRESS_STEPS * 5 -
                Math.round(entry[1].planet.settlementProgress * Planet.NUM_SETTLEMENT_PROGRESS_STEPS) - 1;
            const notSettledYet = Array.from(this.instance.factions.values()).every(faction => {
                if (homeFaction && homeFaction.planetIds.includes(entry[1].planet.id)) {
                    // settle with own faction
                    return true;
                } else {
                    // the faction should not colonize another planet colonized by another faction
                    return !faction.planetIds.includes(entry[0]);
                }
            });
            return worldIsAbleToSettle && roomToSettleMore && notSettledYet;
        });

        // find worlds to invade
        const invasionWorldEntries = entries.filter(entry => {
            const worldIsAbleToSettle = this.isAbleToSettle(entry[1].planet);
            const roomToInvadeMore = entry[1].invaderShipIds.length <= 10;
            // settle new worlds which have not been settled yet
            const startInvasionOfAnotherFaction = !this.instance.invasions.has(entry[1].planet.id) && Array.from(this.instance.factions.values()).some(faction => {
                if (homeFaction && homeFaction.planetIds.includes(entry[1].planet.id)) {
                    // do not invade own faction
                    return false;
                } else {
                    // the faction should invade another planet colonized by another faction
                    return faction.planetIds.includes(entry[0]);
                }
            });
            const continueInvasionOfAnotherFaction = this.instance.invasions.has(entry[1].planet.id) && this.instance.invasions.get(entry[1].planet.id).attacking === homeFaction;
            return worldIsAbleToSettle && roomToInvadeMore && (startInvasionOfAnotherFaction || continueInvasionOfAnotherFaction);
        });

        return {
            offerVassalEntries,
            pirateWorldEntries,
            tradeVassalEntries,
            tradeDealEntries,
            settlementWorldEntries,
            colonizeWorldEntries,
            invasionWorldEntries
        };
    }

    /**
     * Give an order to a ship.
     * @param ship
     */
    public getOrder(ship: Ship): Order {
        const shipData = GetShipData(ship.shipType, this.instance.shipScale);
        if (!shipData) {
            throw new Error("Could not find ship type");
        }

        // select the first task in each category for a ship to do
        const {
            offerVassalEntries,
            pirateWorldEntries,
            tradeVassalEntries,
            tradeDealEntries,
            settlementWorldEntries,
            colonizeWorldEntries,
            invasionWorldEntries
        } = this.getPlanetExplorationEntries(ship.shipType);
        const offerVassalEntry = offerVassalEntries[0];
        const pirateWorldEntry = pirateWorldEntries[0];
        const tradeVassalWorldEntry = tradeVassalEntries[0];
        const tradeVassalWorldEntry2 = tradeVassalEntries[1];
        const tradeVassalWorldEntry3 = tradeVassalEntries[2];
        const tradeDealEntry = tradeDealEntries[0];
        const settlementWorldEntry = settlementWorldEntries[0];
        const settlementWorldEntry2 = settlementWorldEntries[1];
        const settlementWorldEntry3 = settlementWorldEntries[2];
        const settlementWorldEntry4 = settlementWorldEntries[3];
        const settlementWorldEntry5 = settlementWorldEntries[4];
        const colonizeWorldEntry = colonizeWorldEntries[0];
        const colonizeWorldEntry2 = colonizeWorldEntries[1];
        const invasionWorldEntry = invasionWorldEntries[0];
        if (invasionWorldEntry && !this.invasionDemand.has(invasionWorldEntry[0])) {
            this.invasionDemand.set(invasionWorldEntry[0], []);
        }
        const invasionTicks = invasionWorldEntry && this.invasionDemand.get(invasionWorldEntry[0]);
        const invasionEvent: Invasion | undefined = invasionWorldEntry && this.instance.invasions.get(invasionWorldEntry[0]);

        if (!this.county.faction) {
            throw new Error("No faction assigned to planet");
        }

        // queue 5 desire events before beginning an invasion
        if (invasionWorldEntry && invasionTicks.length < 2 && !invasionEvent) {
            const item: IInvasionTick = {
                life: 0,
                maxLife: 5 * 60 * 10
            };
            invasionTicks.push(item);
        }
        if (invasionWorldEntry && invasionTicks.length >= 2 && !invasionEvent) {
            const defendingPlanet = this.instance.planets.get(invasionWorldEntry[0]);
            const defendingFaction = defendingPlanet.county.faction;
            const attackingFaction = this.county.faction;
            this.instance.startInvasion(invasionWorldEntry[0], defendingFaction, attackingFaction);
        }

        if (pirateWorldEntry && shipData.cannons.numCannons > 4) {
            // found a piracy slot, add ship to pirate
            pirateWorldEntry[1].pirateShipIds.push(ship.id);
            this.pirateSlots.push(ship.id);

            const order = new Order(this.instance, ship, this.county.faction);
            order.orderType = EOrderType.PIRATE;
            order.planetId = pirateWorldEntry[0];
            order.expireTicks = 10 * 60 * 20; // pirate for 20 minutes before signing a new contract
            return order;
        } else if (tradeVassalWorldEntry && shipData.cannons.numCannons <= 4) {
            // found a trade slot, add ship to trade
            tradeVassalWorldEntry[1].traderShipIds.push(ship.id);

            const order = new Order(this.instance, ship, this.county.faction);
            order.orderType = EOrderType.FEUDAL_TRADE;
            order.planetId = tradeVassalWorldEntry[0];
            order.expireTicks = 10 * 60 * 20; // trade for 20 minutes before signing a new contract
            return order;
        } else if (tradeVassalWorldEntry2 && shipData.cannons.numCannons <= 4) {
            // found a trade slot, add ship to trade
            tradeVassalWorldEntry2[1].traderShipIds.push(ship.id);

            const order = new Order(this.instance, ship, this.county.faction);
            order.orderType = EOrderType.FEUDAL_TRADE;
            order.planetId = tradeVassalWorldEntry2[0];
            order.expireTicks = 10 * 60 * 20; // trade for 20 minutes before signing a new contract
            return order;
        } else if (tradeVassalWorldEntry3 && shipData.cannons.numCannons <= 4) {
            // found a trade slot, add ship to trade
            tradeVassalWorldEntry3[1].traderShipIds.push(ship.id);

            const order = new Order(this.instance, ship, this.county.faction);
            order.orderType = EOrderType.FEUDAL_TRADE;
            order.planetId = tradeVassalWorldEntry3[0];
            order.expireTicks = 10 * 60 * 20; // trade for 20 minutes before signing a new contract
            return order;
        } else if (tradeDealEntry && shipData.cannons.numCannons <= 4) {
            // found a trade slot, add ship to trade
            tradeDealEntry[0][1].traderShipIds.push(ship.id);
            tradeDealEntry[0][1].planet.registeredTradeDeals.push(tradeDealEntry[1]);
            tradeDealEntry[1].planet.registeredTradeDeals.push({
                fromResourceType: tradeDealEntry[1].toResourceType,
                toResourceType: tradeDealEntry[1].fromResourceType,
                profit: tradeDealEntry[1].profit,
                planet: tradeDealEntry[0][1].planet
            });

            const order = new Order(this.instance, ship, this.county.faction);
            order.orderType = EOrderType.FAIR_TRADE;
            order.planetId = tradeVassalWorldEntry[0];
            order.expireTicks = 10 * 60 * 20; // trade for 20 minutes before signing a new contract
            order.tradeDeal = tradeDealEntry[1];
            return order;
        } else if (invasionWorldEntry && invasionEvent && [EInvasionPhase.STARTING, EInvasionPhase.CAPTURING].includes(invasionEvent.invasionPhase)) {
            // add ship to active invasion
            invasionWorldEntry[1].invaderShipIds.push(ship.id);

            const order = new Order(this.instance, ship, this.county.faction);
            order.orderType = EOrderType.INVADE;
            order.planetId = invasionWorldEntry[0];
            order.expireTicks = 10 * 60 * 20; // invade for 20 minutes before signing a new contract
            return order;
        } else if (invasionWorldEntry && invasionEvent && [EInvasionPhase.PLANNING].includes(invasionEvent.invasionPhase)) {
            // add ship to invasion planning
            invasionWorldEntry[1].invaderShipIds.push(ship.id);

            const order = new Order(this.instance, ship, this.county.faction);
            order.orderType = EOrderType.ROAM;
            order.expireTicks = (invasionEvent.planExpiration / 2) + 10; // wait for invasion to start
            return order;
        } else if (colonizeWorldEntry) {
            // add ship to colonize
            colonizeWorldEntry[1].settlerShipIds.push(ship.id);

            const order = new Order(this.instance, ship, this.county.faction);
            order.orderType = EOrderType.SETTLE;
            order.planetId = colonizeWorldEntry[0];
            return order;
        } else if (colonizeWorldEntry2) {
            // add ship to colonize
            colonizeWorldEntry2[1].settlerShipIds.push(ship.id);

            const order = new Order(this.instance, ship, this.county.faction);
            order.orderType = EOrderType.SETTLE;
            order.planetId = colonizeWorldEntry2[0];
            return order;
        } else if (settlementWorldEntry) {
            // add ship to settle
            settlementWorldEntry[1].settlerShipIds.push(ship.id);

            const order = new Order(this.instance, ship, this.county.faction);
            order.orderType = EOrderType.SETTLE;
            order.planetId = settlementWorldEntry[0];
            return order;
        } else if (settlementWorldEntry2) {
            // add ship to settle
            settlementWorldEntry2[1].settlerShipIds.push(ship.id);

            const order = new Order(this.instance, ship, this.county.faction);
            order.orderType = EOrderType.SETTLE;
            order.planetId = settlementWorldEntry2[0];
            return order;
        } else if (settlementWorldEntry3) {
            // add ship to settle
            settlementWorldEntry3[1].settlerShipIds.push(ship.id);

            const order = new Order(this.instance, ship, this.county.faction);
            order.orderType = EOrderType.SETTLE;
            order.planetId = settlementWorldEntry3[0];
            return order;
        } else if (offerVassalEntry) {
            // offer a ship to a vassal
            const order = new Order(this.instance, ship, this.county.faction);
            order.orderType = EOrderType.TRIBUTE;
            order.planetId = offerVassalEntry[0];
            return order;
        } else if (
            this.county.capital &&
            this.county.capital !== this
        ) {
            // tribute count
            const order = new Order(this.instance, ship, this.county.faction);
            order.orderType = EOrderType.TRIBUTE;
            order.planetId = this.county.capital.id;
            return order;
        } else if (
            this.county.duchy.capital &&
            this.county.duchy.capital.planet &&
            this.county.duchy.capital !== this.county
        ) {
            // tribute duke
            const order = new Order(this.instance, ship, this.county.faction);
            order.orderType = EOrderType.TRIBUTE;
            order.planetId = this.county.duchy.capital.planet.id;
            return order;
        } else if (
            this.county.duchy.kingdom.capital &&
            this.county.duchy.kingdom.capital.capital &&
            this.county.duchy.kingdom.capital.capital.planet &&
            this.county.duchy.kingdom.capital !== this.county.duchy
        ) {
            // tribute king
            const order = new Order(this.instance, ship, this.county.faction);
            order.orderType = EOrderType.TRIBUTE;
            order.planetId = this.county.duchy.kingdom.capital.capital.planet.id;
            return order;
        } else if (
            this.county.duchy.kingdom.faction &&
            this.county.faction &&
            this.county.duchy.kingdom.faction === this.county.faction &&
            this.getRoyalRank() === ERoyalRank.KING
        ) {
            // tribute emperor
            const order = new Order(this.instance, ship, this.county.faction);
            order.orderType = EOrderType.TRIBUTE;
            order.planetId = this.county.duchy.kingdom.faction.homeWorldPlanetId;
            return order;
        } else if (settlementWorldEntry4) {
            // add ship to settle
            settlementWorldEntry4[1].settlerShipIds.push(ship.id);

            const order = new Order(this.instance, ship, this.county.faction);
            order.orderType = EOrderType.SETTLE;
            order.planetId = settlementWorldEntry4[0];
            return order;
        } else if (settlementWorldEntry5) {
            // add ship to settle
            settlementWorldEntry5[1].settlerShipIds.push(ship.id);

            const order = new Order(this.instance, ship, this.county.faction);
            order.orderType = EOrderType.SETTLE;
            order.planetId = settlementWorldEntry5[0];
            return order;
        } else {
            // add ship to explore
            const order = new Order(this.instance, ship, this.county.faction);
            order.orderType = EOrderType.ROAM;
            order.expireTicks = 60 * 10;
            return order;
        }
    }

    public getRoyalRank(): ERoyalRank {
        if (this?.county?.capital === this) {
            if (this?.county && this?.county?.duchy?.capital === this?.county) {
                if (this?.county?.duchy && this?.county?.duchy?.kingdom?.capital === this?.county?.duchy) {
                    if (this?.county?.duchy?.kingdom?.faction && this?.county?.duchy?.kingdom?.faction?.homeWorldPlanetId === this.id) {
                        return ERoyalRank.EMPEROR;
                    } else {
                        return ERoyalRank.KING;
                    }
                } else {
                    return ERoyalRank.DUKE;
                }
            } else {
                return ERoyalRank.COUNT;
            }
        } else {
            return ERoyalRank.UNCLAIMED;
        }
    }

    public isDuchyDomain(other: Planet): boolean {
        return this?.county?.duchy && other?.county?.duchy ? this.county.duchy === other.county.duchy : false;
    }

    public isKingdomDomain(other: Planet): boolean {
        return this?.county?.duchy?.kingdom && other?.county?.duchy?.kingdom ? this.county.duchy.kingdom === other.county.duchy.kingdom : false;
    }

    public isSisterDuchyOfKingdom(other: Planet): boolean {
        return this.isKingdomDomain(other) && !this.isDuchyDomain(other);
    }

    public isUnclaimedSisterDuchyOfKingdom(other: Planet): boolean {
        return other?.county?.duchy?.capital ? this.isSisterDuchyOfKingdom(other) && !other.county.duchy.capital : false;
    }

    public isSisterKingdomOfEmpire(other: Planet): boolean {
        return !this.isKingdomDomain(other);
    }

    public isUnclaimedSisterKingdomOfEmpire(other: Planet): boolean {
        return other?.county?.duchy?.kingdom?.capital ? this.isSisterKingdomOfEmpire(other) && !other.county.duchy.kingdom.capital : false;
    }

    public isImperialCapital(): boolean {
        return this.getRoyalRank() === ERoyalRank.EMPEROR;
    }

    public isKingdomCapital(): boolean {
        return this.getRoyalRank() === ERoyalRank.KING;
    }

    public isDuchyCapital(): boolean {
        return this.getRoyalRank() === ERoyalRank.DUKE;
    }

    public isCountyCapital(): boolean {
        return this.getRoyalRank() === ERoyalRank.COUNT;
    }

    public *getCountiesOfDomain(): Generator<VoronoiCounty> {
        switch (this.getRoyalRank()) {
            case ERoyalRank.EMPEROR: {
                const faction = this?.county?.duchy?.kingdom?.faction;
                if (faction) {
                    const imperialCapital = this.instance.planets.get(faction.homeWorldPlanetId);
                    if (imperialCapital) {
                        // if all counties have a capital, return true
                        const imperialKingdom = imperialCapital.county.duchy.kingdom;
                        for (const duchy of imperialKingdom.duchies) {
                            for (const county of duchy.counties) {
                                yield county;
                            }
                        }
                    }
                }
                break;
            }
            case ERoyalRank.KING: {
                for (const duchy of this?.county?.duchy?.kingdom?.duchies ?? []) {
                    for (const county of duchy.counties) {
                        yield county;
                    }
                }
                break;
            }
            case ERoyalRank.DUKE: {
                for (const county of this?.county?.duchy?.counties ?? []) {
                    yield county;
                }
                break;
            }
            case ERoyalRank.COUNT:
            default: {
                break;
            }
        }
    }

    public *getPlanetsOfDomain(): Generator<Planet> {
        for (const county of Array.from(this.getCountiesOfDomain())) {
            if (county.capital) {
                yield county.capital;
            }
        }
    }

    public isDomainFull(): boolean {
        for (const county of Array.from(this.getCountiesOfDomain())) {
            if (!county.capital) {
                return false;
            }
        }
        return true;
    }

    public isAbleToPirate(): boolean {
        switch (this.getRoyalRank()) {
            case ERoyalRank.EMPEROR:
            case ERoyalRank.KING:
            case ERoyalRank.DUKE: {
                // emperor, king, and dukes can pirate
                return this.isDomainFull();
            }
            case ERoyalRank.COUNT:
            default: {
                // counts do not pirate
                return false;
            }
        }
    }

    public isAbleToTrade(other: Planet): boolean {
        switch (this.getRoyalRank()) {
            case ERoyalRank.EMPEROR: {
                // emperors only trade with kingdom capitals
                return (this.isVassal(other) && other.isKingdomCapital()) ||
                    (this.isKingdomDomain(other) && other.isDuchyCapital()) ||
                    (this.isDuchyDomain(other) && other.isCountyCapital());
            }
            case ERoyalRank.KING: {
                // kings only trade with duchy capitals
                return (this.isKingdomDomain(other) && other.isDuchyCapital()) ||
                    (this.isDuchyDomain(other) && other.isCountyCapital());
            }
            case ERoyalRank.DUKE: {
                // dukes only trade with county capitals
                return this.isDuchyDomain(other) && other.isCountyCapital();
            }
            case ERoyalRank.COUNT:
            default: {
                // counts do not trade
                return false;
            }
        }
    }

    public getBestTradeDeal(other: Planet): ITradeDeal | null {
        for (const tradeDeal of this.possibleTradeDeals) {
            // ignore registered trade deals
            const isRegistered = this.registeredTradeDeals.some(t => {
                return t.fromResourceType === tradeDeal.fromResourceType &&
                    t.toResourceType === tradeDeal.toResourceType &&
                    t.planet === tradeDeal.planet;
            });
            if (isRegistered) {
                continue;
            }

            const localHasResource = this.availableMarketResources.some(r => r.resourceType === tradeDeal.fromResourceType);
            const remoteHasResource = other.availableMarketResources.some(r => r.resourceType === tradeDeal.toResourceType);
            if (localHasResource && remoteHasResource) {
                return tradeDeal;
            }
        }
        return null;
    }

    public isAbleToSettle(other: Planet): boolean {
        switch (this.getRoyalRank()) {
            case ERoyalRank.EMPEROR: {
                // emperors can settle anywhere
                return true;
            }
            case ERoyalRank.KING: {
                // kings only settle within their domain
                return this.isKingdomDomain(other);
            }
            case ERoyalRank.DUKE: {
                // dukes only settle within their domain
                return this.isDuchyDomain(other);
            }
            case ERoyalRank.COUNT:
            default: {
                // counts do not settle
                return false;
            }
        }
    }

    public isUnclaimed(): boolean {
        return this.getRoyalRank() === ERoyalRank.UNCLAIMED;
    }

    public isVassal(other: Planet): boolean {
        switch (this.getRoyalRank()) {
            case ERoyalRank.EMPEROR: {
                return !!(this.county.duchy.kingdom.faction &&
                    other.county.duchy.kingdom.faction &&
                    this.county.duchy.kingdom.faction === other.county.duchy.kingdom.faction);
            }
            case ERoyalRank.KING: {
                return this.county.duchy.kingdom === other.county.duchy.kingdom;
            }
            case ERoyalRank.DUKE: {
                return this.county.duchy === other.county.duchy;
            }
            case ERoyalRank.COUNT: {
                return this.county === other.county;
            }
            default: {
                return false;
            }
        }
    }

    public getLordWorld(): Planet {
        switch (this.getRoyalRank()) {
            case ERoyalRank.EMPEROR: {
                return this;
            }
            case ERoyalRank.KING: {
                const planet = Array.from(this.instance.planets.values()).find(p => {
                    return this.county.duchy.kingdom.faction &&
                        p.id === this.county.duchy.kingdom.faction.homeWorldPlanetId;
                });
                if (!planet) {
                    throw new Error("Could not find imperial capital");
                }
                return planet;
            }
            case ERoyalRank.DUKE: {
                const planet = this.county.duchy.kingdom.capital?.capital?.planet;
                if (!planet) {
                    throw new Error("Could not find kingdom capital");
                }
                return planet;
            }
            case ERoyalRank.COUNT: {
                const planet = this.county.duchy.capital?.planet;
                if (!planet) {
                    throw new Error("Could not find duchy capital");
                }
                return planet;
            }
            default: {
                throw new Error("Planet is not part of royal hierarchy");
            }
        }
    }

    /**
     * Apply a new luxury buff to a faction.
     * @param account A gold holding account which increases after trading.
     * @param resourceType The resource type affects the buff.
     * @param planetId The source world of the goods.
     * @param amount The amount multiplier of the resource.
     * @param isPirated The goods were pirated.
     */
    public applyLuxuryBuff(account: MoneyAccount, resourceType: EResourceType, planetId: string, amount: number, isPirated: boolean) {
        // update luxury buff
        const oldLuxuryBuff = this.luxuryBuffs.find(l => l.matches(resourceType, planetId));
        let percentReplenished = 1;
        if (oldLuxuryBuff) {
            percentReplenished = oldLuxuryBuff.replenish();
            oldLuxuryBuff.amount = amount;
        } else if (this.county.faction) {
            this.luxuryBuffs.push(new LuxuryBuff(this.instance, this.county.faction, this, resourceType, planetId, amount));
        }

        // update economy
        if (this.economySystem && this.moneyAccount) {
            this.economySystem.recomputeResources();

            // pay merchant
            const goldAmount = Math.floor(this.moneyAccount.computePriceForResourceType(resourceType) * amount * percentReplenished);
            const payment: ICurrency[] = [{
                currencyId: "GOLD", // OK
                amount: goldAmount,
            }];
            const moneyAccount = new MoneyAccount(goldAmount);
            PlanetaryMoneyAccount.MakePaymentWithTaxes(moneyAccount, this.moneyAccount, payment, this.feudalGovernment.feudalObligationRatio); // pay government
            PlanetaryMoneyAccount.PayBonusFromBalance(account, this.moneyAccount, payment, isPirated ? 1 / 50 : 1 / 100); // sell goods bonus 1% of government balance
        }
    }

    public isEnemyPresenceTick(): boolean {
        if (this.enemyPresenceTick <= 0) {
            this.enemyPresenceTick = Planet.ENEMY_PRESENCE_TICK_COOL_DOWN;
            return true;
        } else {
            this.enemyPresenceTick -= 1;
            return false;
        }
    }

    public isShipDemandTick(): boolean {
        if (this.shipDemandTickCoolDown <= 0) {
            this.shipDemandTickCoolDown = Planet.SHIP_DEMAND_TICK_COOL_DOWN;
            return true;
        } else {
            this.shipDemandTickCoolDown -= 1;
            return false;
        }
    }

    public computeShipDemand() {
        const {
            tradeVassalEntries,
            pirateWorldEntries,
            colonizeWorldEntries,
            invasionWorldEntries
        } = this.getPlanetExplorationEntries();

        // reset demand
        for (const shipType of Object.values(EShipType)) {
            this.shipsDemand[shipType] = 0;
        }

        // compute new demand
        this.shipsDemand[EShipType.CUTTER] += tradeVassalEntries.reduce((acc, t) => {
            const numberOfCuttersNeededForPlanet = t[1].planet.feudalObligationResources.length;
            return acc + numberOfCuttersNeededForPlanet;
        }, 0);
        this.shipsDemand[EShipType.CORVETTE] = Math.min(this.numPirateSlots, pirateWorldEntries.length) +
            Math.max(0, Math.min(colonizeWorldEntries.length, 10));

        // invasion demand
        if (this.county.faction) {
            const factionProperties = DEFAULT_FACTION_PROPERTIES[this.county.faction.id];
            if (factionProperties) {
                const lastThreeShipTypes = factionProperties.shipTypes.slice(-3);
                for (let i = 0; i < lastThreeShipTypes.length; i++) {
                    const shipType = lastThreeShipTypes[i];
                    this.shipsDemand[shipType] = invasionWorldEntries.length * Math.max(3 - i, 1);
                }
            }
        }
    }

    public getNextShipTypeToBuild(): EShipType {
        // build next ship based on local ship demand
        for (const shipType of Object.values(EShipType)) {
            if (this.shipsAvailable[shipType] < this.shipsDemand[shipType] && this.getNumShipsAvailable(shipType) > 1) {
                return shipType;
            }
        }

        // build next ship based on vassal ship demand
        for (const shipType of Object.values(EShipType)) {
            for (const planet of Array.from(this.getPlanetsOfDomain())) {
                if (planet.shipsAvailable[shipType] < planet.shipsDemand[shipType] && this.getNumShipsAvailable(shipType) > 1) {
                    return shipType;
                }
            }
        }

        // build next ship based on lord ship demand
        try {
            for (const shipType of Object.values(EShipType)) {
                let lordWorld = this.getLordWorld();
                for (let i = 0; i < 100; i++) {
                    if (lordWorld.shipsAvailable[shipType] < lordWorld.shipsDemand[shipType] && this.getNumShipsAvailable(shipType) > 1) {
                        return shipType;
                    }
                    const nextLordWorld = this.getLordWorld();
                    if (nextLordWorld === lordWorld) {
                        break;
                    } else {
                        lordWorld = nextLordWorld;
                    }
                }
            }
        } catch (e) {

        }

        // build a distribution of ship types when there is no demand
        let defaultShipType: EShipType = EShipType.CUTTER;
        if (this.county.faction) {
            const factionProperty = DEFAULT_FACTION_PROPERTIES[this.county.faction.id];
            const shipTotalCost = factionProperty.shipTypes.reduce((acc, v) => acc + GetShipData(v, 1).cost, 0);
            const shipPoints = factionProperty.shipTypes.map((v): [EShipType, number] => [v, shipTotalCost - GetShipData(v, 1).cost]);
            const shipTotalPoints = shipPoints.reduce((acc, v) => acc + v[1], 0);
            for (const shipType of factionProperty.shipTypes) {
                if (this.shipsAvailable[shipType] + this.shipyard.shipsBuilding[shipType] < Math.ceil(this.shipIds.length * (shipPoints.find(s => s[0] === shipType)[1] / shipTotalPoints))) {
                    return shipType;
                }
            }
            defaultShipType = factionProperty.shipTypes[0];
        }
        const firstEntry = (Object.entries(this.shipyard.shipsAvailable) as [EShipType, number][]).sort((a, b) => GetShipData(b[0], 1).cost - GetShipData(a[0], 1).cost).find(([key, value]) => value > 2);
        return (firstEntry ? firstEntry[0] : undefined) ?? defaultShipType;
    }

    public buildInitialResourceBuildings() {
        this.buildings.push(
            ...this.naturalResources.map(naturalResource => new Plantation(this.instance, this, naturalResource))
        );
    }

    public findFeudalLord(): FeudalGovernment | null {
        switch (this.getRoyalRank()) {
            default:
            case ERoyalRank.EMPEROR: {
                // non royal governments and emperors do not have feudal lords.
                return null;
            }
            case ERoyalRank.KING:
            case ERoyalRank.DUKE:
            case ERoyalRank.COUNT: {
                // kings, dukes, and counts have feudal lords
                const planet = this.getLordWorld();
                if (planet.feudalGovernment) {
                    return planet.feudalGovernment;
                } else {
                    return null;
                }
            }
        }
    }

    public setAsStartingCapital() {
        this.size = 10;
        this.settlementProgress = 1;
        this.settlementLevel = ESettlementLevel.CAPITAL;
        this.naturalResources = [...CAPITAL_GOODS];
    }

    // rebuild the resources array based on events such as less or more items
    public recomputeResources() {
        if (this.settlementLevel < ESettlementLevel.OUTPOST || this.settlementLevel >= ESettlementLevel.CAPITAL) {
            // do not update resources if an unsettled world or capital world
            return;
        }

        // update resources array
        this.resources.splice(0, this.resources.length);
        // start with capital goods
        this.resources.push(...this.naturalResources.filter(r => CAPITAL_GOODS.includes(r)).map(resourceType => ({
            resourceType,
            amount: 1,
            feudalObligation: false,
        })));
        // start with produced resources
        this.resources.push(...this.producedResources);
        // compute imported resources
        this.importedResources.splice(0, this.importedResources.length);
        for (const luxuryBuff of this.luxuryBuffs) {
            this.importedResources.push({
                resourceType: luxuryBuff.resourceType,
                amount: luxuryBuff.amount,
                sourcePlanetId: luxuryBuff.planetId,
                pirated: false,
            });
        }
        // insert imported resources
        for (const importedResource of this.importedResources) {
            const oldResource = this.resources.find(r => r.resourceType === importedResource.resourceType);
            if (oldResource) {
                oldResource.amount += importedResource.amount;
            } else {
                this.resources.push({
                    resourceType: importedResource.resourceType,
                    amount: importedResource.amount,
                    feudalObligation: false,
                });
            }
        }
        // subtract manufactured resources
        for (const manufacturedResource of this.manufacturedResources) {
            // the amount of recipes that can be produced
            let amount: number = manufacturedResource.amount;
            for (const ingredient of manufacturedResource.ingredients) {
                const oldResource = this.resources.find(i => i.resourceType === ingredient.resourceType);
                if (oldResource) {
                    // compute recipe amount
                    amount = Math.min(amount, Math.floor(oldResource.amount / (ingredient.amount * manufacturedResource.amount)));
                } else {
                    // resource not found, 0 recipe amount
                    amount = 0;
                }
            }
            // if there is at least one recipe amount
            if (amount > 0) {
                for (const ingredient of manufacturedResource.ingredients) {
                    const oldResource = this.resources.find(i => i.resourceType === ingredient.resourceType);
                    if (oldResource) {
                        oldResource.amount -= ingredient.amount * amount;
                    }
                }
                for (const product of manufacturedResource.products) {
                    const oldResource = this.resources.find(i => i.resourceType === product.resourceType);
                    if (oldResource) {
                        oldResource.amount += product.amount * amount;
                    } else {
                        this.resources.push({
                            resourceType: product.resourceType,
                            amount: product.amount * amount,
                            feudalObligation: false,
                        });
                    }
                }
            }
        }

        // setup feudal obligations and market goods
        let feudalObligationAmount = this.feudalGovernment ?
            Math.ceil(this.resources.reduce((acc, r) => {
                return acc + r.amount;
            }, 0) * this.feudalGovernment.getCurrentFeudalObligationRatio()) :
            0;
        this.feudalObligationResources.splice(0, this.feudalObligationResources.length);
        const splitResource = (resource: IResourceExported, amount: number) => {
            if (amount >= resource.amount) {
                this.feudalObligationResources.push({
                    ...resource,
                    feudalObligation: true,
                });
            } else if (amount <= 0) {
                this.marketResources.push({
                    ...resource,
                    feudalObligation: false,
                });
            } else {
                const feudalAmount = amount;
                const marketAmount = resource.amount - feudalAmount;
                this.feudalObligationResources.push({
                    resourceType: resource.resourceType,
                    amount: feudalAmount,
                    feudalObligation: true,
                });
                this.marketResources.push({
                    resourceType: resource.resourceType,
                    amount: marketAmount,
                    feudalObligation: false,
                });
            }
        };
        for (const resource of this.resources) {
            splitResource(resource, feudalObligationAmount);
            feudalObligationAmount -= resource.amount;
        }
    }

    public depositBank(playerId: string, moneyAccount: MoneyAccount, payment: ICurrency) {
        moneyAccount.removeMoney(payment);
        if (!this.bankAccounts.has(playerId)) {
            this.bankAccounts.set(playerId, {
                playerId,
                balance: 0
            });
        }
        this.bankAccounts.get(playerId)!.balance += payment.amount;
    }

    public withdrawBank(playerId: string, moneyAccount: MoneyAccount, payment: ICurrency) {
        if ((this.bankAccounts.get(playerId)?.balance ?? 0) >= payment.amount) {
            if (!this.bankAccounts.has(playerId)) {
                this.bankAccounts.set(playerId, {
                    playerId,
                    balance: 0
                });
            }
            this.bankAccounts.get(playerId)!.balance -= payment.amount;
            moneyAccount.addMoney(payment);
        }
    }

    public depositInvestment(playerId: string, moneyAccount: MoneyAccount, payment: ICurrency) {
        moneyAccount.removeMoney(payment);
        if (!this.investmentAccounts.has(playerId)) {
            this.investmentAccounts.set(playerId, {
                playerId,
                lots: []
            });
        }
        this.investmentAccounts.get(playerId).lots.push({
            amount: payment.amount,
            matureAmount: payment.amount,
            ticksRemaining: 10 * 60 * 10,
            maturityTicks: 10 * 60 * 10,
        });
    }

    public withdrawInvestment(playerId: string, moneyAccount: MoneyAccount, payment: ICurrency) {
        if ((this.investmentAccounts.get(playerId)?.lots.reduce((acc, lot) => acc + (lot.ticksRemaining === 0 ? lot.matureAmount : 0), 0) ?? 0) >= payment.amount) {
            if (!this.investmentAccounts.has(playerId)) {
                this.investmentAccounts.set(playerId, {
                    playerId,
                    lots: []
                });
            }
            let paymentAmount = payment.amount;
            for (const lot of this.investmentAccounts.get(playerId)!.lots) {
                if (lot.ticksRemaining > 0) {
                    continue;
                }
                const takeAmount = Math.min(lot.matureAmount, paymentAmount);
                lot.matureAmount -= takeAmount;
                lot.amount -= Math.min(lot.amount, takeAmount);
                paymentAmount -= takeAmount;
                if (paymentAmount === 0) {
                    break;
                }
            }
            this.investmentAccounts.get(playerId)!.lots = this.investmentAccounts.get(playerId)!.lots.filter(x => x.matureAmount > 0);
            moneyAccount.addMoney(payment);
        }
    }

    public rewardAttackers(invasionEvent: Invasion, success: boolean) {
        const bestAttackers = invasionEvent.attackerScores;
        for (const attackerItem of bestAttackers) {
            const index = bestAttackers.indexOf(attackerItem);
            const rewardMoney = invasionEvent.getRewardMoney(index, success);

            const playerData = this.instance.playerData.get(attackerItem.playerId);
            if (playerData) {
                const ship = this.instance.ships.get(playerData.shipId);
                if (ship) {
                    const payment = {currencyId: "GOLD", amount: rewardMoney};
                    ship.moneyAccount.addMoney(payment);
                    playerData.moneyAccount.addMoney(payment);
                    PlanetaryMoneyAccount.PayBonusFromBalance(playerData.moneyAccount, ship.planet.moneyAccount, [payment], 1 / 10 / bestAttackers.length);
                    this.instance.soundEvents.push({
                        shipId: ship.id,
                        soundType: ESoundType.MONEY,
                        soundEventType: ESoundEventType.ONE_OFF
                    });

                    this.instance.addFormEmitter(playerData.id, {type: EFormEmitterType.INVASION, id: invasionEvent.planetId});
                }

                if (index === 0 && success) {
                    const faction = this.instance.factions.get(playerData.factionId);
                    if (faction) {
                        faction.factionPlanetRoster.push({
                            factionId: faction.id,
                            kingdomId: this.county.duchy.kingdom.capital.capital.capital.id,
                            duchyId: this.county.duchy.capital.capital.id,
                            countyId: this.county.capital.id,
                            playerId: playerData.id,
                        });
                        this.instance.soundEvents.push({
                            shipId: ship.id,
                            soundType: ESoundType.LAND,
                            soundEventType: ESoundEventType.ONE_OFF
                        });
                    }
                }
            }
        }
    }
    public rewardDefenders(invasionEvent: Invasion, success: boolean) {
        const bestDefenders = invasionEvent.defenderScores;
        for (const bestDefender of bestDefenders) {
            const index = bestDefenders.indexOf(bestDefender);
            const rewardMoney = invasionEvent.getRewardMoney(index, success);

            const playerData = this.instance.playerData.get(bestDefender.playerId);
            if (playerData) {
                const ship = this.instance.ships.get(playerData.shipId);
                if (ship) {
                    const payment = {currencyId: "GOLD", amount: rewardMoney};
                    ship.moneyAccount.addMoney(payment);
                    playerData.moneyAccount.addMoney(payment);
                    PlanetaryMoneyAccount.PayBonusFromBalance(playerData.moneyAccount, ship.planet.moneyAccount, [payment], 1 / 10 / bestDefenders.length);
                    this.instance.soundEvents.push({
                        shipId: ship.id,
                        soundType: ESoundType.MONEY,
                        soundEventType: ESoundEventType.ONE_OFF
                    });
                }
            }
        }
    }

    public handlePlanetLoop() {
        if (this.settlementLevel < ESettlementLevel.OUTPOST) {
            // planets smaller than colonies do nothing
            return;
        }

        // recompute resources for the first few ticks to initialize the planet economy
        if (this.numTicks < 5) {
            this.recomputeResources();
        }
        this.numTicks += 1;

        // handle buildings
        for (const building of this.buildings) {
            if (
                (this.settlementLevel >= ESettlementLevel.OUTPOST && building.buildingType === EBuildingType.PLANTATION) ||
                (this.settlementLevel >= ESettlementLevel.OUTPOST && building.buildingType === EBuildingType.MANUFACTORY) ||
                (this.settlementLevel >= ESettlementLevel.OUTPOST && building.buildingType === EBuildingType.FORESTRY)
            ) {
                // outposts have working plantations but no shipyards or other general infrastructure
                building.handleBuildingLoop();
            } else if (this.settlementLevel >= ESettlementLevel.COLONY) {
                // colonies and larger settlements have general infrastructure
                building.handleBuildingLoop();
            }
        }

        // handle construction of new buildings
        const nextBuildingToBuild = this.getNextBuildingToBuild();
        if (nextBuildingToBuild) {
            this.buildings.push(nextBuildingToBuild)
        }

        // handle upgrades of buildings
        const {
            nextBuilding: nextBuildingToUpgrade,
            nextBuildingCost: nextUpgradeCost
        } = this.getNextBuildingUpgrade();
        if (this.woodConstruction >= nextUpgradeCost) {
            nextBuildingToUpgrade.upgrade();
        }

        // handle ship demand loop
        if (this.isShipDemandTick()) {
            this.computeShipDemand();
        }

        // captain new AI ships
        const nextShipTypeToBuild = this.getNextShipTypeToBuild();
        if (
            (this.getRoyalRank() === ERoyalRank.EMPEROR ? true : this.shipIds.length < 3) &&
            this.county.faction &&
            this.getNumShipsAvailable(nextShipTypeToBuild) > 1 &&
            this.county.faction.shipIds.length < this.county.faction.maxShips &&
            this.moneyAccount &&
            this.moneyAccount.cash.hasEnough(this.shipyard.quoteShip(nextShipTypeToBuild, true)) &&
            this.instance.spawnAiShips &&
            Object.values(this.explorationGraph).length > 0 &&
            this.allowedToSpawn()
        ) {
            if ([EServerType.STANDALONE].includes(this.instance.serverType)) {
                this.spawnShip(this.moneyAccount.cash, nextShipTypeToBuild, true);
            } else if ([EServerType.PHYSICS_NODE].includes(this.instance.serverType) && !this.instance.spawningPlanets.has(this.id)) {
                const loadBalancer = Array.from(this.instance.shardList.values()).find(s => s.type === EServerType.LOAD_BALANCER);
                if (loadBalancer) {
                    const spawnAiShipMessage: ISpawnAiShardMessage = {
                        shardMessageType: EShardMessageType.SPAWN_AI_SHIP,
                        planetId: this.id,
                        shipType: nextShipTypeToBuild
                    };
                    this.instance.outgoingShardMessages.push([loadBalancer.name, spawnAiShipMessage]);
                    this.instance.spawningPlanets.add(this.id);
                }
            }
        }

        // handle the luxury buffs from trading
        const expiredLuxuryBuffs: LuxuryBuff[] = [];
        for (const luxuryBuff of this.luxuryBuffs) {
            const expired = luxuryBuff.expired();
            if (expired) {
                expiredLuxuryBuffs.push(luxuryBuff);
            } else {
                luxuryBuff.handleLuxuryBuffLoop();
            }
        }
        for (const expiredLuxuryBuff of expiredLuxuryBuffs) {
            expiredLuxuryBuff.remove();
        }

        // handle player investment accounts
        for (const [key, value] of [...this.investmentAccounts.entries()]) {
            for (const lot of value.lots) {
                if (lot.ticksRemaining > 0) {
                    lot.ticksRemaining -= 1;
                }
                lot.maturityTicks -= 1;
                if (lot.maturityTicks <= 0) {
                    lot.maturityTicks = 10 * 60 * 10;
                    lot.matureAmount += Math.ceil(lot.amount * 1.1);
                }
            }
        }

        // handle enemy presence loop
        if (this.isEnemyPresenceTick()) {
            for (const node of Object.values(this.explorationGraph)) {
                if (node.enemyStrength > 0) {
                    node.enemyStrength -= 1;
                }
            }
        }

        // handle invasion demand decrementing
        for (const [key, tickItems] of Array.from(this.invasionDemand.entries())) {
            this.invasionDemand.set(key, tickItems.filter(i => i.life < i.maxLife));
        }

        // handle control point for invasion event
        const invasionEvent = this.instance.invasions.get(this.id);
        if (invasionEvent) {
            switch (invasionEvent.invasionPhase) {
                case EInvasionPhase.PLANNING: {
                    break;
                }
                case EInvasionPhase.STARTING:
                case EInvasionPhase.CAPTURING: {
                    const nearbyShips = this.county.ships;
                    const numFriendlies = nearbyShips.filter(s => s.faction === invasionEvent.defending).length;
                    const numEnemies = nearbyShips.filter(s => s.faction === invasionEvent.attacking).length;
                    const total = numFriendlies + numEnemies;
                    const friendlyRatio = total > 0 ? numFriendlies / total : 0;
                    const enemyRatio = total > 0 ? numEnemies / total : 0;
                    const hasFriends = friendlyRatio > 0.33;
                    const hasEnemies = enemyRatio > 0.33;
                    if (hasFriends && hasEnemies) {
                        invasionEvent.applyCaptureProgress(EInvasionCaptureState.CONTESTED);
                    } else if (hasFriends && !hasEnemies) {
                        invasionEvent.applyCaptureProgress(EInvasionCaptureState.LIBERATING);
                    } else if (!hasFriends && hasEnemies) {
                        invasionEvent.applyCaptureProgress(EInvasionCaptureState.CAPTURING);
                    } else {
                        invasionEvent.applyCaptureProgress(EInvasionCaptureState.NONE);
                    }
                    break;
                }
                case EInvasionPhase.CAPTURED: {
                    if (invasionEvent.captureDoneTick === 0) {
                        // give rewards
                        for (const shipId of [...this.shipIds]) {
                            const ship = this.instance.ships.get(shipId);
                            if (ship) {
                                // to lazy to make ships free ships, I'll self-destruct them on failure instead.
                                ship.health = 0;
                            }
                        }

                        this.claim(invasionEvent.attacking, true, null);

                        this.rewardAttackers(invasionEvent, true);
                        this.rewardDefenders(invasionEvent, false);
                    }
                    if (invasionEvent.captureDoneTick === 100) {
                        this.instance.invasions.delete(this.id);
                    }
                    break;
                }
                case EInvasionPhase.REPELLED: {
                    // remove invasion
                    if (invasionEvent.captureDoneTick === 0) {
                        this.rewardAttackers(invasionEvent, false);
                        this.rewardDefenders(invasionEvent, true);
                    }
                    if (invasionEvent.captureDoneTick === 100) {
                        this.instance.invasions.delete(this.id);
                    }
                    break;
                }
            }
        }

        // handle resource economy
        if (this.moneyAccount) {
            this.moneyAccount.handlePlanetaryEconomy();
        }

        // handle feudal lord taxes
        if (this.numTicks % 600 === 0) {
            const payment = this.moneyAccount.taxes.currencies.filter(x => ({...x}));
            this.moneyAccount.taxes.makePayment(this.getLordWorld().moneyAccount.cash, payment);
        }

        // handle ownership auctions
        if (this.ownershipAuctionResultTick > 0) {
            this.ownershipAuctionResultTick -= 1;
        }
        if (!this.ownedByPlayer() && this.ownershipStage === EPlanetOwnershipStage.OWNED) {
            this.ownershipAuctionBid = null;
            this.ownershipStage = EPlanetOwnershipStage.BEGIN_AUCTION;
        }
        if (this.ownershipStage === EPlanetOwnershipStage.ACTIVE_AUCTION) {
            if (this.ownershipAuctionTick > 0) {
                this.ownershipAuctionTick -= 1;
            }
            if (this.ownershipAuctionTick <= 0 && this.ownershipAuctionBid) {
                // transfer money
                const oldPlayerId = this.county.faction.factionPlanetRoster.find(r => r.countyId === this.id)?.playerId;
                const newPlayerId = this.ownershipAuctionBid.playerId;
                const oldPlayerData = oldPlayerId && this.instance.playerData.get(oldPlayerId);
                const newPlayerData = newPlayerId && this.instance.playerData.get(newPlayerId);
                if (oldPlayerData && newPlayerData) {
                    const payment = [{currencyId: "GOLD", amount: this.ownershipAuctionBid.amount}];
                    if (oldPlayerData && newPlayerData) {
                        newPlayerData.moneyAccount.makePayment(oldPlayerData.moneyAccount, payment)
                    }
                }
                if (oldPlayerData && oldPlayerData.shipId) {
                    this.instance.soundEvents.push({
                        shipId: oldPlayerData.shipId,
                        soundType: ESoundType.MONEY,
                        soundEventType: ESoundEventType.ONE_OFF
                    });
                }
                if (newPlayerData && newPlayerData.shipId) {
                    this.instance.soundEvents.push({
                        shipId: newPlayerData.shipId,
                        soundType: ESoundType.LAND,
                        soundEventType: ESoundEventType.ONE_OFF
                    });
                }
                if (newPlayerData) {
                    // transfer planet
                    const oldIndex = this.county.faction.factionPlanetRoster.findIndex(r => r.countyId === this.id);
                    if (oldIndex >= 0) {
                        this.county.faction.factionPlanetRoster.splice(0, 1);
                    }
                    this.county.faction.factionPlanetRoster.push({
                        playerId: this.ownershipAuctionBid.playerId,
                        factionId: this.county.faction.id,
                        countyId: this.county.capital.id,
                        duchyId: this.county.duchy.capital.capital.id,
                        kingdomId: this.county.duchy.kingdom.capital.capital.capital.id
                    });
                }

                // notify all players of the result
                for (const playerId of this.ownershipAuctionBid.playerIds) {
                    this.instance.addFormEmitter(playerId, {type: EFormEmitterType.PLANET_AUCTION, id: this.id});
                }

                this.ownershipStage = EPlanetOwnershipStage.OWNED;
                this.ownershipAuctionBid = null;
                this.ownershipAuctionTick = 60 * 10;
                this.ownershipAuctionResultTick = 10 * 10;
            }
        }

        // handle player forms
        const handleTradeScreen = (playerId: string, ship: Ship) => {
            const canTrade = ship.faction === this.county.faction && VoronoiGraph.angularDistanceQuaternion(ship.positionVelocity.clone(), this.instance.worldScale) < Game.VELOCITY_STEP;
            const hasTradeScreen = this.tradeScreens.has(playerId);
            if (canTrade && !hasTradeScreen) {
                this.tradeScreens.set(playerId, {isTrading: false});
                this.instance.addFormEmitter(playerId, {type: EFormEmitterType.PLANET, id: this.id});
            }
            if (!canTrade && hasTradeScreen) {
                this.tradeScreens.delete(playerId);
                this.instance.removeFormEmitter(playerId, {type: EFormEmitterType.PLANET, id: this.id});
            }
        };
        for (const ship of this.county.ships) {
            const playerId = Array.from(this.instance.playerData.values()).find(x => x.shipId === ship.id)?.id;
            handleTradeScreen(playerId, ship);
        }
        for (const playerId of Array.from(this.tradeScreens.keys())) {
            const playerData = this.instance.playerData.get(playerId);
            if (playerData) {
                const ship = this.instance.ships.get(playerData.shipId);
                if (ship) {
                    handleTradeScreen(playerId, ship);
                }
            }
        }
    }

    private ownedByPlayer(): boolean {
        return this.county.faction.factionPlanetRoster.some(r => r.countyId === this.id && !!r.playerId);
    }

    private getTradeScreenVariablesForPlayer(playerId: string) {
        const defaultValues = {
            playerData: undefined,
            playerShip: undefined,
            cashAmount: 0,
            repairAmount: 0,
            bankBalanceAmount: 0,
            investment: 0,
            maturity: 0,
            investmentMinimum: 100,
            bidAmount: 0,
        };

        const playerData = this.instance.playerData.get(playerId);
        if (!playerData) {
            return defaultValues;
        }
        const playerShip = this.instance.ships.get(playerData.shipId);
        if (!playerShip) {
            return defaultValues;
        }

        const cashAmount = playerData.moneyAccount.getGold();
        const repairAmount = playerShip.maxHealth - playerShip.health - playerShip.burnTicks.reduce((acc, x) => acc + x, 0);
        const bankBalanceAmount = this.bankAccounts.get(playerId)?.balance ?? 0;
        const investment = this.investmentAccounts.get(playerId)?.lots.reduce((acc, lot) => acc + lot.amount, 0) ?? 0;
        const maturity = this.investmentAccounts.get(playerId)?.lots.reduce((acc, lot) => acc + (lot.ticksRemaining === 0 ? lot.matureAmount : 0), 0) ?? 0;
        const investmentMinimum = 100;

        const latestAuctionBid = this.ownershipAuctionBid;
        const bidAmount = latestAuctionBid?.amount;

        return {
            playerData,
            playerShip,
            cashAmount,
            repairAmount,
            bankBalanceAmount,
            investment,
            maturity,
            investmentMinimum,
            bidAmount,
        };
    }

    public getOwnershipCard(playerId: string, cashAmount: number, bidAmount: number): IFormCard[] {
        const isOwner = Array.from(this.instance.factions.values()).some(f => f.factionPlanetRoster.some(r => r.countyId === this.id && r.playerId === playerId));
        if (isOwner) {
            switch (this.ownershipStage) {
                case EPlanetOwnershipStage.OWNED: {
                    return [{
                        title: "Ownership",
                        fields: [[{
                            label: "Sell",
                            dataField: undefined,
                            type: EFormFieldType.BUTTON,
                            isReadOnly: false,
                            buttonPath: EPlanetFormActions.OWNERSHIP_SALE
                        }]],
                        data: {}
                    }];
                }
                case EPlanetOwnershipStage.BEGIN_AUCTION: {
                    return [{
                        title: "Ownership - Begin Auction",
                        fields: [[{
                            label: "Cancel",
                            dataField: undefined,
                            type: EFormFieldType.BUTTON,
                            isReadOnly: false,
                            buttonPath: EPlanetFormActions.OWNERSHIP_SALE_CANCEL
                        }]],
                        data: {}
                    }];
                }
                case EPlanetOwnershipStage.ACTIVE_AUCTION: {
                    return [{
                        title: "Ownership - Active Auction",
                        fields: [[{
                            label: "Bid Amount",
                            dataField: undefined,
                            type: EFormFieldType.BUTTON,
                            isReadOnly: false,
                            buttonPath: EPlanetFormActions.OWNERSHIP_BID
                        }]],
                        data: {
                            bidAmount,
                        }
                    }];
                }
                default: {
                    return [];
                }
            }
        } else {
            switch (this.ownershipStage) {
                case EPlanetOwnershipStage.OWNED: {
                    return [] as IFormCard[];
                }
                case EPlanetOwnershipStage.BEGIN_AUCTION: {
                    return [{
                        title: "Begin Auction",
                        fields: [[{
                            label: "Cash",
                            dataField: "cashAmount",
                            type: EFormFieldType.NUMBER,
                            isReadOnly: true,
                            buttonPath: undefined
                        }], [{
                            label: "Amount",
                            dataField: "amount",
                            type: EFormFieldType.NUMBER,
                            isReadOnly: false,
                            buttonPath: undefined
                        }], [{
                            label: "Bid",
                            dataField: undefined,
                            type: EFormFieldType.BUTTON,
                            isReadOnly: false,
                            buttonPath: EPlanetFormActions.OWNERSHIP_BID
                        }]],
                        data: {
                            cashAmount,
                        }
                    }];
                }
                case EPlanetOwnershipStage.ACTIVE_AUCTION: {
                    return [{
                        title: "Active Auction",
                        fields: [[{
                            label: "Cash",
                            dataField: "cashAmount",
                            type: EFormFieldType.NUMBER,
                            isReadOnly: true,
                            buttonPath: undefined
                        }], [{
                            label: "Bid Amount",
                            dataField: "bidAmount",
                            type: EFormFieldType.NUMBER,
                            isReadOnly: true,
                            buttonPath: undefined
                        }], [{
                            label: "Amount",
                            dataField: "amount",
                            type: EFormFieldType.NUMBER,
                            isReadOnly: false,
                            buttonPath: undefined
                        }], [{
                            label: "Bid",
                            dataField: undefined,
                            type: EFormFieldType.BUTTON,
                            isReadOnly: false,
                            buttonPath: EPlanetFormActions.OWNERSHIP_BID
                        }]],
                        data: {
                            cashAmount,
                            bidAmount,
                        }
                    }];
                }
                default: {
                    return [] as IFormCard[];
                }
            }
        }
    }

    public getTradeScreenForPlayer(playerId: string): IFormCard[] {
        const state = this.tradeScreens.get(playerId);
        if (state) {
            if (state.isTrading) {
                const {
                    cashAmount,
                    repairAmount,
                    bankBalanceAmount,
                    investment,
                    maturity,
                    investmentMinimum,
                    bidAmount,
                } = this.getTradeScreenVariablesForPlayer(playerId);

                const cards: IFormCard[] = [{
                    title: "Repair",
                    fields: [[{
                        label: "Cash",
                        dataField: "cashAmount",
                        type: EFormFieldType.NUMBER,
                        isReadOnly: true,
                        buttonPath: undefined
                    }], [{
                        label: "Amount",
                        dataField: "repairAmount",
                        type: EFormFieldType.NUMBER,
                        isReadOnly: true,
                        buttonPath: undefined
                    }], [{
                        label: "Repair",
                        dataField: undefined,
                        type: EFormFieldType.BUTTON,
                        isReadOnly: false,
                        buttonPath: EPlanetFormActions.REPAIR
                    }]],
                    data: {
                        cashAmount,
                        repairAmount,
                    }
                }, {
                    title: "Banking",
                    fields: [[{
                        label: "Cash",
                        dataField: "cashAmount",
                        type: EFormFieldType.NUMBER,
                        isReadOnly: true,
                        buttonPath: undefined
                    }], [{
                        label: "Balance",
                        dataField: "bankBalanceAmount",
                        type: EFormFieldType.NUMBER,
                        isReadOnly: true,
                        buttonPath: undefined
                    }], [{
                        label: "Amount",
                        dataField: "amount",
                        type: EFormFieldType.NUMBER,
                        isReadOnly: false,
                        buttonPath: undefined
                    }], [{
                        label: "Deposit",
                        dataField: undefined,
                        type: EFormFieldType.BUTTON,
                        isReadOnly: false,
                        buttonPath: EPlanetFormActions.DEPOSIT
                    }], [{
                        label: "Withdraw",
                        dataField: undefined,
                        type: EFormFieldType.BUTTON,
                        isReadOnly: false,
                        buttonPath: EPlanetFormActions.WITHDRAW
                    }]],
                    data: {
                        cashAmount,
                        bankBalanceAmount,
                    }
                }, {
                    title: "Investment",
                    fields: [[{
                        label: "Cash",
                        dataField: "cashAmount",
                        type: EFormFieldType.NUMBER,
                        isReadOnly: true,
                        buttonPath: undefined
                    }], [{
                        label: "Investment",
                        dataField: "investment",
                        type: EFormFieldType.NUMBER,
                        isReadOnly: true,
                        buttonPath: undefined
                    }], [{
                        label: "Maturity",
                        dataField: "maturity",
                        type: EFormFieldType.NUMBER,
                        isReadOnly: true,
                        buttonPath: undefined
                    }], [{
                        label: "Minimum",
                        dataField: "investmentMinimum",
                        type: EFormFieldType.NUMBER,
                        isReadOnly: true,
                        buttonPath: undefined
                    }], [{
                        label: "Amount",
                        dataField: "amount",
                        type: EFormFieldType.NUMBER,
                        isReadOnly: false,
                        buttonPath: undefined
                    }], [{
                        label: "Invest",
                        dataField: undefined,
                        type: EFormFieldType.BUTTON,
                        isReadOnly: false,
                        buttonPath: EPlanetFormActions.INVEST
                    }], [{
                        label: "Return",
                        dataField: undefined,
                        type: EFormFieldType.BUTTON,
                        isReadOnly: false,
                        buttonPath: EPlanetFormActions.RETURN
                    }]],
                    data: {
                        cashAmount,
                        investment,
                        maturity,
                        investmentMinimum,
                    }
                }];

                cards.splice(0, 0, ...this.getOwnershipCard(playerId, cashAmount, bidAmount));

                return cards;
            } else {
                return [{
                    title: "Port of " + this.name,
                    fields: [[{
                        label: "Enter",
                        dataField: undefined,
                        type: EFormFieldType.BUTTON,
                        isReadOnly: false,
                        buttonPath: EPlanetFormActions.ENTER_PORT
                    }]],
                    data: {}
                }];
            }
        }
        return [];
    }

    public getAuctionResultForPlayer(playerId: string): IFormCard[] {
        const playerData = this.instance.playerData.get(playerId);
        if (!playerData) {
            return [];
        }
        const faction = this.instance.factions.get(playerData.factionId);
        if (!faction) {
            return [];
        }

        const cards: IFormCard[] = [];
        if (this.ownedByPlayer() && this.ownershipAuctionResultTick > 0) {
            if (this.county.faction.factionPlanetRoster.some(r => r.countyId === this.id && r.playerId === playerId)) {
                cards.push({
                    title: "You won the auction for " + this.name,
                    fields: [],
                    data: {}
                });
            } else {
                cards.push({
                    title: "You lost the auction for " + this.name,
                    fields: [],
                    data: {}
                });
            }
        }
        return cards;
    }

    public handleTradeScreenRequestsForPlayer(playerId: string, request: IFormRequest) {
        const {
            playerData,
            playerShip,
            cashAmount,
            repairAmount,
            bankBalanceAmount,
            maturity,
            investmentMinimum,
        } = this.getTradeScreenVariablesForPlayer(playerId);

        switch (request.buttonPath as EPlanetFormActions) {
            case EPlanetFormActions.ENTER_PORT: {
                const playerTradeScreen = this.tradeScreens.get(playerId);
                if (playerTradeScreen) {
                    playerTradeScreen.isTrading = true;
                }
                break;
            }
            case EPlanetFormActions.REPAIR: {
                const amount = Math.min(cashAmount, repairAmount);
                if (playerData && playerShip) {
                    PlanetaryMoneyAccount.MakePaymentWithTaxes(playerData.moneyAccount, this.moneyAccount, [{ currencyId: "GOLD", amount }], this.feudalGovernment.feudalObligationRatio); // repairs
                    playerShip.health += amount;
                }
                break;
            }
            case EPlanetFormActions.DEPOSIT: {
                const amount = Math.min(cashAmount, request.data.amount);
                if (playerData) {
                    this.depositBank(playerId, playerData.moneyAccount, {currencyId: "GOLD", amount}); // OK
                }
                break;
            }
            case EPlanetFormActions.WITHDRAW: {
                const amount = Math.min(bankBalanceAmount, request.data.amount);
                if (playerData) {
                    this.withdrawBank(playerId, playerData.moneyAccount, {currencyId: "GOLD", amount}); // OK
                }
                break;
            }
            case EPlanetFormActions.INVEST: {
                const amount = Math.min(cashAmount, request.data.amount);
                if (amount < investmentMinimum) {
                    break;
                }
                if (playerData) {
                    this.depositInvestment(playerId, playerData.moneyAccount, {currencyId: "GOLD", amount}); // OK
                }
                break;
            }
            case EPlanetFormActions.RETURN: {
                const amount = Math.min(maturity, request.data.amount);
                if (playerData) {
                    this.withdrawInvestment(playerId, playerData.moneyAccount, {currencyId: "GOLD", amount}); // OK
                }
                break;
            }
            case EPlanetFormActions.OWNERSHIP_SALE: {
                this.ownershipAuctionBid = null;
                this.ownershipStage = EPlanetOwnershipStage.BEGIN_AUCTION;
                break;
            }
            case EPlanetFormActions.OWNERSHIP_SALE_CANCEL: {
                this.ownershipAuctionBid = null;
                this.ownershipStage = EPlanetOwnershipStage.OWNED;
                break;
            }
            case EPlanetFormActions.OWNERSHIP_BID: {
                const amount = Math.min(cashAmount, request.data.amount);

                const firstBid = this.ownershipAuctionBid === null;
                if (amount > 0 && (firstBid || amount > this.ownershipAuctionBid.amount))
                this.ownershipAuctionBid = {
                    playerId,
                    amount,
                    playerIds: [] as string[]
                };
                if (firstBid) {
                    this.ownershipAuctionTick = 60 * 10;
                    this.ownershipStage = EPlanetOwnershipStage.ACTIVE_AUCTION;
                }
                if (!this.ownershipAuctionBid.playerIds.includes(playerId)) {
                    this.ownershipAuctionBid.playerIds.push(playerId);
                }
                break;
            }
        }
    }

    public handleShipDestroyed(ship: Ship, shouldNetwork: boolean) {
        if (shouldNetwork && [EServerType.AI_NODE, EServerType.PHYSICS_NODE].includes(this.instance.serverType)) {
            const claimMessage: IDestroyShipPlanetShardMessage = {
                shardMessageType: EShardMessageType.DESTROY_SHIP_PLANET,
                planetId: this.id,
                shipId: ship.id,
            };
            const loadBalancerShard = Array.from(this.instance.shardList.values()).find(s => s.type === EServerType.LOAD_BALANCER);
            this.instance.outgoingShardMessages.push([loadBalancerShard.name, claimMessage]);
            return;
        }

        // remove ship from exploration graph
        for (const order of ship.orders) {
            if (!order.planetId) {
                continue;
            }

            const node = this.explorationGraph[order.planetId];
            const invaderIndex = node.invaderShipIds.findIndex(s => s === ship.id);
            if (invaderIndex >= 0) {
                node.settlerShipIds.splice(invaderIndex, 1);
            }
            const settlerIndex = node.settlerShipIds.findIndex(s => s === ship.id);
            if (settlerIndex >= 0) {
                node.settlerShipIds.splice(settlerIndex, 1);
            }
            const traderIndex = node.traderShipIds.findIndex(s => s === ship.id);
            if (traderIndex >= 0) {
                node.traderShipIds.splice(traderIndex, 1);
            }
            const pirateIndex = node.pirateShipIds.findIndex(s => s === ship.id);
            if (pirateIndex >= 0) {
                node.pirateShipIds.splice(pirateIndex, 1);
            }
        }

        // remove ship from faction registry
        const shipIndex = this.shipIds.findIndex(s => s === ship.id);
        if (shipIndex >= 0) {
            this.shipIds.splice(shipIndex, 1);
        }
        const pirateSlotIndex = this.pirateSlots.findIndex(s => s === ship.id);
        if (pirateSlotIndex >= 0) {
            this.pirateSlots.splice(pirateSlotIndex, 1);
        }
        this.shipsAvailable[ship.shipType] -= 1;
    }

    public tribute(ship: Ship, shouldNetwork: boolean) {
        if (shouldNetwork && [EServerType.AI_NODE, EServerType.PHYSICS_NODE].includes(this.instance.serverType)) {
            const claimMessage: ITributeShipPlanetShardMessage = {
                shardMessageType: EShardMessageType.TRIBUTE_SHIP_PLANET,
                planetId: this.id,
                shipId: ship.id,
            };
            const loadBalancerShard = Array.from(this.instance.shardList.values()).find(s => s.type === EServerType.LOAD_BALANCER);
            this.instance.outgoingShardMessages.push([loadBalancerShard.name, claimMessage]);
            return;
        }

        // remove ship from old planet's roster
        if (ship.planet) {
            ship.planet.handleShipDestroyed(ship, false);
        }

        // add ship to new planet roster
        this.addNewShip(ship);

        const payment = {currencyId: "GOLD", amount: 100};
        ship.moneyAccount.addMoney(payment);
        const playerData = Array.from(this.instance.playerData.values()).find(x => x.shipId == ship.id);
        if (playerData) {
            playerData.moneyAccount.addMoney(payment);
            PlanetaryMoneyAccount.PayBonusFromBalance(playerData.moneyAccount, ship.planet.moneyAccount, [payment], 1 / 100);
        }
        this.instance.soundEvents.push({
            shipId: ship.id,
            soundType: ESoundType.MONEY,
            soundEventType: ESoundEventType.ONE_OFF
        });
    }

    /**
     * Determine the next building to upgrade.
     */
    getNextBuildingUpgrade(): {
        nextBuilding: Building,
        nextBuildingCost: number
    } {
        // find the cheapest building to upgrade
        let nextBuilding: Building | null = null;
        let nextBuildingCost: number | null = null;
        for (const building of this.buildings) {
            // skip buildings which are upgrading.
            if (building.upgradeProgress > 0) {
                continue;
            }
            // skip buildings which are not plantation if the settlement is smaller than a colony
            if (
                (building.buildingType === EBuildingType.PLANTATION && this.settlementLevel < ESettlementLevel.OUTPOST) ||
                (building.buildingType === EBuildingType.MANUFACTORY && this.settlementLevel < ESettlementLevel.OUTPOST)
            ) {
                continue;
            }
            const buildingCost = building.getUpgradeCost();
            if (!nextBuildingCost || (nextBuildingCost && buildingCost < nextBuildingCost)) {
                nextBuilding = building;
                nextBuildingCost = buildingCost;
            }
        }
        if (nextBuilding && nextBuildingCost) {
            return {
                nextBuilding,
                nextBuildingCost
            };
        } else {
            throw new Error("Could not find a building to get upgrade costs");
        }
    }

    /**
     * Determine the next building to build.
     */
    getNextBuildingToBuild(): Building | null {
        // find next manufacture to build
        const recipe = ITEM_RECIPES.find(recipe => {
            return recipe.ingredients.every(ingredient => {
                let amount = 0;
                for (const resource of this.marketResources) {
                    if (resource.resourceType === ingredient.resourceType) {
                        amount += resource.amount;
                    }
                }
                return amount >= ingredient.amount;
            });
        });
        const existingBuilding = this.buildings.find(b => b.buildingType === EBuildingType.MANUFACTORY && (b as Manufactory).recipe === recipe);
        if (recipe && !existingBuilding) {
            return new Manufactory(this.instance, this, recipe);
        } else {
            return null;
        }
    }

    /**
     * The planet will trade with a ship.
     * @param ship
     * @param shouldNetwork If the message should go over the network
     * @param unload if the ship will not take cargo
     * @param specificBuy a specific resource to buy
     */
    trade(ship: Ship, shouldNetwork: boolean, unload: boolean = false, specificBuy: EResourceType | null = null) {
        if (shouldNetwork && [EServerType.AI_NODE, EServerType.PHYSICS_NODE].includes(this.instance.serverType)) {
            const claimMessage: ITradeShipPlanetShardMessage = {
                shardMessageType: EShardMessageType.TRADE_SHIP_PLANET,
                planetId: this.id,
                shipId: ship.id,
                unload,
                specificBuy
            };
            const loadBalancerShard = Array.from(this.instance.shardList.values()).find(s => s.type === EServerType.LOAD_BALANCER);
            this.instance.outgoingShardMessages.push([loadBalancerShard.name, claimMessage]);
            return;
        }

        // a list of items to buy from ship and sell to ship
        let goodsToTake: EResourceType[] = [];
        let goodsToOffer: IResourceExported[] = [];

        // different levels of settlements take different goods
        if (this.settlementLevel === ESettlementLevel.UNTAMED) {
            goodsToTake = CAPITAL_GOODS;
            goodsToOffer = [];
        } else if (this.settlementLevel >= ESettlementLevel.OUTPOST && this.settlementLevel <= ESettlementLevel.PROVINCE) {
            goodsToTake = CAPITAL_GOODS;
            goodsToOffer = this.feudalObligationResources;
        } else if (this.settlementLevel === ESettlementLevel.CAPITAL) {
            // the capital will take outpost goods and pirated goods
            goodsToTake = Array.from(new Set([
                ...OUTPOST_GOODS,
                ...ship.cargo.filter(c => c.pirated).map(c => c.resourceType)
            ]));
            goodsToOffer = this.feudalObligationResources;
        }

        // buy a specific good for fair trade
        if (specificBuy) {
            goodsToOffer = this.marketResources.filter(r => r.resourceType === specificBuy);
        }

        // do not take cargo, because the ship is beginning a piracy mission
        if (unload) {
            goodsToOffer = [];
        }

        // trade with the ship
        for (const goodToTake of goodsToTake) {
            const boughtGood = ship.buyGoodFromShip(goodToTake);
            if (boughtGood && this.moneyAccount) {
                this.applyLuxuryBuff(this.moneyAccount.cash, goodToTake, boughtGood.sourcePlanetId, boughtGood.amount, boughtGood.pirated);

                // score loot
                const playerData = Array.from(this.instance.playerData.values()).find(p => p.shipId === ship.id);
                const count = boughtGood.pirated ? boughtGood.amount : 0;
                if (playerData && count) {
                    if ([EServerType.STANDALONE].includes(this.instance.serverType)) {
                        const item = this.instance.scoreBoard.loot.find(i => i.playerId === playerData.id);
                        if (item) {
                            item.count += count;
                        } else {
                            this.instance.scoreBoard.loot.push({
                                playerId: playerData.id,
                                name: playerData.name,
                                count
                            });
                        }
                        this.instance.scoreBoard.loot.sort((a, b) => b.count - a.count);
                    } else if ([EServerType.PHYSICS_NODE].includes(this.instance.serverType)) {
                        const globalScoreBoardMessage: ILootScoreShardMessage = {
                            shardMessageType: EShardMessageType.LOOT_SCORE,
                            playerId: playerData.id,
                            name: playerData.name,
                            count
                        };
                        const globalShard = Array.from(this.instance.shardList.values()).find(s => s.type === EServerType.GLOBAL_STATE_NODE);
                        this.instance.outgoingShardMessages.push([globalShard.name, globalScoreBoardMessage]);
                    }

                    const payment = {currencyId: "GOLD", amount: 1000};
                    ship.moneyAccount.addMoney(payment);
                    playerData.moneyAccount.addMoney(payment);

                    this.instance.soundEvents.push({
                        shipId: ship.id,
                        soundType: ESoundType.LOOT,
                        soundEventType: ESoundEventType.ONE_OFF
                    });
                }
            }
        }
        for (let i = 0; i < goodsToOffer.length; i++) {
            if (ship.sellGoodToShip(goodsToOffer[this.feudalObligationResourceCycle % this.feudalObligationResources.length], this.id)) {
                this.feudalObligationResourceCycle = (this.feudalObligationResourceCycle + 1) % this.feudalObligationResources.length;
            }
        }

        const payment = {currencyId: "GOLD", amount: 100};
        ship.moneyAccount.addMoney(payment);
        const playerData = Array.from(this.instance.playerData.values()).find(x => x.shipId == ship.id);
        if (playerData) {
            playerData.moneyAccount.addMoney(payment)
        }
        this.instance.soundEvents.push({
            shipId: ship.id,
            soundType: ESoundType.MONEY,
            soundEventType: ESoundEventType.ONE_OFF
        });
    }

    /**
     * Create a new ship.
     */
    public spawnShip(account: MoneyAccount, shipType: EShipType, asFaction: boolean = false): Ship {
        // check ship availability
        if (this.shipyard.shipsAvailable[shipType] === 0) {
            throw new Error("No ships available");
        }

        // perform gold transaction, paying 50% taxes to the faction
        return this.shipyard.buyShip(account, shipType, asFaction);
    }

    public spawnEventShip(account: MoneyAccount, shipType: EShipType, callback: (ship: Ship) => void): void {
        const ship = this.shipyard.buyShip(new MoneyAccount(1000 * 1000), shipType, true);
        callback(ship);
    }

    addNewShip(ship: Ship) {
        this.shipIds.push(ship.id);
        this.shipsAvailable[ship.shipType] += 1;
        ship.planet = this;
    }

    createShip(shipType: EShipType): Ship {
        // get the position of the planet
        const planetWorld = this.instance.planets.get(this.id);
        if (!planetWorld) {
            throw new Error("Could not find planet to spawn ship");
        }
        const shipPoint = planetWorld.position.rotateVector([0, 0, 1]);

        // get faction of the ship
        const faction = Array.from(this.instance.factions.values()).find(f => f.planetIds.includes(this.id));
        if (!faction) {
            throw new Error("Could not find faction to spawn ship");
        }

        // create ship
        const ship = new Ship(this.instance, shipType);
        ship.faction = faction;
        ship.planet = this;
        ship.id = `ship-${this.id}-${faction.getShipAutoIncrement()}`;
        Game.addRandomPositionAndOrientationToEntity(ship);
        ship.position = Quaternion.fromBetweenVectors([0, 0, 1], shipPoint);
        ship.color = faction.factionColor;

        // the faction ship
        if ([EServerType.PHYSICS_NODE].includes(this.instance.serverType)) {
            const factionShipMessage: ICreateShipFactionShardMessage = {
                shardMessageType: EShardMessageType.CREATE_SHIP_FACTION,
                factionId: faction.id,
                shipId: ship.id,
                shipType: ship.shipType
            };

            const globalShard = Array.from(this.instance.shardList.values()).find(s => s.type === EServerType.GLOBAL_STATE_NODE);
            this.instance.outgoingShardMessages.push([globalShard.name, factionShipMessage]);
        } else {
            faction.shipIds.push(ship.id);
            faction.shipsAvailable[ship.shipType] += 1;
        }
        faction.instance.ships.set(ship.id, ship);
        this.addNewShip(ship);

        return ship;
    }
}