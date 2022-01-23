import {EResourceType, ICargoItem, IItemRecipe, ITEM_DATA} from "./Resource";
import {Game} from "./Game";
import {ICurrency, MoneyAccount} from "./Interface";
import {EShipType, GetShipData, Ship, SHIP_DATA} from "./Ship";
import {
    Planet
} from "./Planet";
import {PlanetaryCurrencySystem} from "./PlanetaryCurrencySystem";
import {ISerializedPlanetaryMoneyAccount, PlanetaryEconomyDemand} from "./PlanetaryEconomyDemand";
import {PlanetaryEconomySystem} from "./PlanetaryEconomySystem";
import {IMarketPrice} from "./Market";

export class ShipyardDock {
    public instance: Game;
    public planet: Planet;
    public shipyard: Shipyard;
    public progress: number = 0;
    public shipCost: number = 0;
    public shipType: EShipType | null = null;
    public sentDoneSignal: boolean = false;

    public serialize(): ISerializedShipyardDock {
        return {
            progress: this.progress,
            shipCost: this.shipCost,
            shipType: this.shipType,
            sentDoneSignal: this.sentDoneSignal
        };
    }

    public static deserialize(instance: Game, planet: Planet, shipyard: Shipyard, data: ISerializedShipyardDock): ShipyardDock {
        const item = new ShipyardDock(instance, planet, shipyard);
        item.deserializeUpdate(data);
        return item;
    }

    public deserializeUpdate(data: ISerializedShipyardDock) {
        this.progress = data.progress;
        this.shipCost = data.shipCost;
        this.shipType = data.shipType;
        this.sentDoneSignal = data.sentDoneSignal;
    }

    constructor(instance: Game, planet: Planet, shipyard: Shipyard) {
        this.instance = instance;
        this.planet = planet;
        this.shipyard = shipyard;
    }

    public beginBuildingOfShip(shipType: EShipType) {
        const shipData = GetShipData(shipType, this.instance.shipScale);
        if (!shipData) {
            throw new Error("Could not find ship type");
        }
        this.shipCost = shipData.cost;
        this.progress = 0;
        this.shipType = shipData.shipType;
    }

    /**
     * Handle the construction of a ship.
     */
    public handleShipyardDockLoop() {
        // handle ship building progress
        if (this.progress < this.shipCost) {
            this.progress += 1;
        }
        if (this.progress >= this.shipCost && !this.sentDoneSignal) {
            // ship is done
            this.shipyard.dockIsDone(this);
            this.sentDoneSignal = true;
        }
    }

    /**
     * Determine if a shipyard is done.
     */
    public isDone(): boolean {
        return this.progress >= this.shipCost;
    }
}

/**
 * The different types of upgradable buildings.
 */
export enum EBuildingType {
    /**
     * A building which produces wood.
     */
    FORESTRY = "FORESTRY",
    /**
     * A building which produces a natural resource.
     */
    PLANTATION = "PLANTATION",
    /**
     * A building which produces a refined product.
     */
    MANUFACTORY = "MANUFACTORY",
    /**
     * A building which produces iron.
     */
    MINE = "MINE",
    /**
     * A building which produces tools and weapons.
     */
    BLACKSMITH = "BLACKSMITH",
    /**
     * The building which produces new ships
     */
    SHIPYARD = "SHIPYARD",
}

/**
 * A building on a planet which can produce resources, to help the island planet function.
 */
export abstract class Building {
    public instance: Game;
    public planet: Planet;
    /**
     * The type of a building.
     */
    public abstract buildingType: EBuildingType;
    /**
     * The level of the building.
     */
    public buildingLevel: number = 1;
    /**
     * The upgrade progress of a building.
     */
    public upgradeProgress: number = 0;

    /**
     * Handle the basic function of the building.
     */
    public handleBuildingLoop(): void {
        // basic upgrade loop
        if (this.upgradeProgress > 0) {
            this.upgradeProgress -= 1;
            if (this.upgradeProgress <= 0) {
                this.buildingLevel += 1;
                this.planet.recomputeResources();
            }
        }
    }

    /**
     * The upgrade cost of the building.
     */
    public abstract getUpgradeCost(): number;

    /**
     * Begin the upgrade of a building.
     */
    public upgrade(): void {
        // do not upgrade a building that is already upgrading
        if (this.upgradeProgress > 0) {
            return;
        }

        // five minutes to upgrade
        const upgradeCost = this.getUpgradeCost();
        this.planet.woodConstruction -= upgradeCost;
        this.upgradeProgress = upgradeCost;
    }

    constructor(instance: Game, planet: Planet) {
        this.instance = instance;
        this.planet = planet;
    }

    public abstract serialize(): ISerializedBuilding;

    public static deserializeBuilding(instance: Game, planet: Planet, data: ISerializedBuilding): Building {
        switch (data.buildingType) {
            case EBuildingType.SHIPYARD:
                return Shipyard.deserialize(instance, planet, data);
            case EBuildingType.FORESTRY:
                return Forestry.deserialize(instance, planet, data);
            case EBuildingType.MINE:
                return Mine.deserialize(instance, planet, data);
            case EBuildingType.BLACKSMITH:
                return Blacksmith.deserialize(instance, planet, data);
            case EBuildingType.PLANTATION:
                return Plantation.deserialize(instance, planet, data);
            case EBuildingType.MANUFACTORY:
                return Manufactory.deserialize(instance, planet, data);
        }
        throw new Error("Missing building deserialization");
    }

    public abstract deserializeUpdate(data: ISerializedBuilding);
}

/**
 * A shipyard which spawns ships.
 */
export class Shipyard extends Building {
    public docks: ShipyardDock[] = [];
    public numberOfDocks: number = 10;
    public numShipsAvailable: number = 0;
    public shipsAvailable: Record<EShipType, number> = {
        [EShipType.CUTTER]: 0,
        [EShipType.SLOOP]: 0,
        [EShipType.CORVETTE]: 0,
        [EShipType.BRIGANTINE]: 0,
        [EShipType.BRIG]: 0,
        [EShipType.FRIGATE]: 0
    };
    public shipsBuilding: Record<EShipType, number> = {
        [EShipType.CUTTER]: 0,
        [EShipType.SLOOP]: 0,
        [EShipType.CORVETTE]: 0,
        [EShipType.BRIGANTINE]: 0,
        [EShipType.BRIG]: 0,
        [EShipType.FRIGATE]: 0
    };

    buildingType: EBuildingType = EBuildingType.SHIPYARD;

    public serialize(): ISerializedBuilding {
        const item: ISerializedShipyard = {
            docks: this.docks.map(d => d.serialize()),
            numberOfDocks: this.numberOfDocks,
            numShipsAvailable: this.numShipsAvailable,
            shipsAvailable: this.shipsAvailable,
            shipsBuilding: this.shipsBuilding,
            buildingType: this.buildingType,
            buildingLevel: this.buildingLevel,
            upgradeProgress: this.upgradeProgress,
        };
        return item;
    }

    public static deserialize(instance: Game, planet: Planet, data: ISerializedBuilding): Shipyard {
        const item = new Shipyard(instance, planet);
        item.deserializeUpdate(data as ISerializedShipyard);
        return item;
    }

    public deserializeUpdate(data: ISerializedShipyard) {
        if (this.docks.length === data.docks.length) {
            this.docks.forEach(d => d.deserializeUpdate(d));
        } else {
            this.docks = data.docks.map(d => ShipyardDock.deserialize(this.instance, this.planet, this, d));
        }
        this.numberOfDocks = data.numberOfDocks;
        this.numShipsAvailable = data.numShipsAvailable;
        this.shipsAvailable = data.shipsAvailable;
        this.shipsBuilding = data.shipsBuilding;
        this.buildingType = data.buildingType;
        this.buildingLevel = data.buildingLevel;
        this.upgradeProgress = data.upgradeProgress;
    }

    getUpgradeCost(): number {
        // 5 minutes to begin upgrade
        return 5 * 60 * 10 * Math.pow(this.buildingLevel + 1, Math.sqrt(2));
    }

    public getNextShipTypeToBuild(): EShipType {
        if (this.shipsAvailable.CUTTER + this.shipsBuilding.CUTTER < this.numberOfDocks * 3 / 10) {
            return EShipType.CUTTER;
        }
        if (this.shipsAvailable.SLOOP + this.shipsBuilding.SLOOP < this.numberOfDocks * 3 / 10) {
            return EShipType.SLOOP;
        }
        return EShipType.CORVETTE;
    }

    public getNumberOfDocksAtUpgradeLevel(): number {
        return this.buildingLevel * 10;
    }

    /**
     * Build a new ship once in a while.
     */
    public handleBuildingLoop() {
        super.handleBuildingLoop();

        // handle dock upgrades
        const nextNumberOfDocks = this.getNumberOfDocksAtUpgradeLevel();
        if (this.numberOfDocks !== nextNumberOfDocks) {
            this.numberOfDocks = nextNumberOfDocks;
        }

        const nextShipTypeToBuild = this.getNextShipTypeToBuild();
        const shipData = GetShipData(nextShipTypeToBuild, this.instance.shipScale);
        if (!shipData) {
            throw new Error("Could not find ship type");
        }

        // build ship when there is enough wood and enough room
        if (
            this.planet.wood >= shipData.cost &&
            this.planet.cannons >= shipData.cannons.numCannons &&
            this.planet.cannonades >= shipData.cannons.numCannonades &&
            this.docks.length < this.numberOfDocks
        ) {
            this.buildShip(shipData.shipType);
        }

        // handle each dock
        for (const dock of this.docks) {
            dock.handleShipyardDockLoop();
        }
    }

    /**
     * Begin the process of building a ship.
     */
    public buildShip(shipType: EShipType) {
        const shipData = GetShipData(shipType, this.instance.shipScale);
        if (!shipData) {
            throw new Error("Could not find ship type");
        }

        // give wood to dock and begin building of ship.
        this.planet.wood -= shipData.cost;
        this.planet.cannons -= shipData.cannons.numCannons;
        this.planet.cannonades -= shipData.cannons.numCannonades;
        const dock = new ShipyardDock(this.instance, this.planet, this);
        this.docks.push(dock);
        dock.beginBuildingOfShip(shipType);
        this.shipsBuilding[shipType] += 1;
    }

    /**
     * Event handler when a dock is done being built.
     * @param dock
     */
    public dockIsDone(dock: ShipyardDock) {
        if (!dock.shipType) {
            throw new Error("Dock must have ship type to be done");
        }
        this.shipsBuilding[dock.shipType] -= 1;
        this.numShipsAvailable += 1;
        this.shipsAvailable[dock.shipType] += 1;
    }

    /**
     * Player bought a ship from the shipyard.
     */
    public buyShip(account: MoneyAccount, shipType: EShipType, asFaction: boolean = false): Ship {
        // check gold
        const shipPrice = this.quoteShip(shipType, asFaction);
        if (!account.hasEnough(shipPrice)) {
            throw new Error("Need more gold to buy this ship");
        }

        // perform gold transaction
        if (!this.planet.moneyAccount) {
            throw new Error("Shipyard building ships without money account");
        }
        PlanetaryMoneyAccount.MakePaymentWithTaxes(account, this.planet.moneyAccount, shipPrice, 0.5);

        // spawn the ship
        const doneDockIndex = this.docks.findIndex(d => d.isDone() && d.shipType === shipType);
        const dock = this.docks[doneDockIndex];
        if (!(dock && dock.shipType)) {
            throw new Error("Dock must have ship type to be done");
        }
        this.docks.splice(doneDockIndex, 1);
        this.numShipsAvailable -= 1;
        this.shipsAvailable[dock.shipType] -= 1;
        return this.planet.createShip(dock.shipType);
    }

    /**
     * The price of the ship to buy.
     */
    public quoteShip(shipType: EShipType, asFaction: boolean = false): ICurrency[] {
        // factions get free ships
        if (asFaction) {
            return [];
        }

        const shipData = GetShipData(shipType, this.instance.shipScale);
        if (!shipData) {
            throw new Error("Could not find ship type");
        }

        const priceCeiling = Math.ceil(shipData.cost * 3);
        const priceFloor = 0;
        const price = Math.ceil(shipData.cost * (3 / (this.shipsAvailable[shipData.shipType] / this.getNumberOfDocksAtUpgradeLevel() * 10)));
        const goldAmount = Math.max(priceFloor, Math.min(price, priceCeiling));
        return [{
            currencyId: "GOLD",
            amount: goldAmount
        }];
    }
}

/**
 * A building which produces wood.
 */
export class Forestry extends Building {
    buildingType: EBuildingType = EBuildingType.FORESTRY;

    public serialize(): ISerializedBuilding {
        return {
            buildingType: this.buildingType,
            buildingLevel: this.buildingLevel,
            upgradeProgress: this.upgradeProgress,
        };
    }

    public static deserialize(instance: Game, planet: Planet, data: ISerializedBuilding) {
        const item = new Forestry(instance, planet);
        item.deserializeUpdate(data);
        return item;
    }

    public deserializeUpdate(data: ISerializedBuilding) {
        this.buildingType = data.buildingType;
        this.buildingLevel = data.buildingLevel;
        this.upgradeProgress = data.upgradeProgress;
    }

    getUpgradeCost(): number {
        // forestry requires 2 minutes to begin upgrade
        return 2 * 60 * 10 * Math.pow(this.buildingLevel + 1, Math.sqrt(2));
    }

    handleBuildingLoop() {
        super.handleBuildingLoop();

        // add wood proportional to building level
        this.planet.wood += this.buildingLevel;
        this.planet.woodConstruction += this.buildingLevel;
    }
}

/**
 * A building which produces natural resources.
 */
export class Plantation extends Building {
    buildingType: EBuildingType = EBuildingType.PLANTATION;
    resourceType: EResourceType;

    public serialize(): ISerializedBuilding {
        const item: ISerializedPlantation = {
            buildingType: this.buildingType,
            buildingLevel: this.buildingLevel,
            upgradeProgress: this.upgradeProgress,
            resourceType: this.resourceType,
        };
        return item;
    }

    public static deserialize(instance: Game, planet: Planet, data: ISerializedBuilding) {
        const item = new Plantation(instance, planet, (data as ISerializedPlantation).resourceType);
        item.deserializeUpdate(data as ISerializedPlantation);
        return item;
    }

    public deserializeUpdate(data: ISerializedPlantation) {
        this.buildingType = data.buildingType;
        this.buildingLevel = data.buildingLevel;
        this.upgradeProgress = data.upgradeProgress;
        this.resourceType = data.resourceType;
    }

    constructor(instance: Game, planet: Planet, resourceType: EResourceType) {
        super(instance, planet);
        this.resourceType = resourceType;
    }

    getUpgradeCost(): number {
        // forestry requires 2 minutes to begin upgrade
        return 2 * 60 * 10 * Math.pow(this.buildingLevel + 1, Math.sqrt(2));
    }

    handleBuildingLoop() {
        super.handleBuildingLoop();

        // add wood proportional to building level
        const oldProducedResource = this.planet.producedResources.find(r => r.resourceType === this.resourceType);
        if (oldProducedResource) {
            // upgrade resources array
            oldProducedResource.amount = this.buildingLevel;
        } else {
            // add new resources array
            this.planet.producedResources.push({
                resourceType: this.resourceType,
                amount: this.buildingLevel,
                feudalObligation: false,
            });
        }
    }
}

/**
 * A building which produces manufactured resources.
 */
export class Manufactory extends Building {
    buildingType: EBuildingType = EBuildingType.MANUFACTORY;
    recipe: IItemRecipe;

    public serialize(): ISerializedBuilding {
        const item: ISerializedManufactory = {
            buildingType: this.buildingType,
            buildingLevel: this.buildingLevel,
            upgradeProgress: this.upgradeProgress,
            recipe: this.recipe,
        };
        return item;
    }

    public static deserialize(instance: Game, planet: Planet, data: ISerializedBuilding) {
        const item = new Manufactory(instance, planet, (data as ISerializedManufactory).recipe);
        item.deserializeUpdate(data as ISerializedManufactory);
        return item;
    }

    public deserializeUpdate(data: ISerializedManufactory) {
        this.buildingType = data.buildingType;
        this.buildingLevel = data.buildingLevel;
        this.upgradeProgress = data.upgradeProgress;
        this.recipe = data.recipe;
    }

    constructor(instance: Game, planet: Planet, recipe: IItemRecipe) {
        super(instance, planet);
        this.recipe = recipe;
        this.buildingLevel = 0;
    }

    getUpgradeCost(): number {
        // check for available room to upgrade
        const hasRoomToUpgradeManufacturing = this.recipe.ingredients.every(ingredient => {
            let amount = 0;
            for (const resource of this.planet.marketResources) {
                if (resource.resourceType === ingredient.resourceType) {
                    amount += resource.amount;
                }
            }
            return amount >= ingredient.amount * (this.buildingLevel + 1);
        });

        if (hasRoomToUpgradeManufacturing) {
            // factory requires 5 minutes to begin upgrade
            return 5 * 60 * 10 * Math.pow(this.buildingLevel + 1, Math.sqrt(2));
        } else {
            return Number.MAX_VALUE;
        }
    }

    handleBuildingLoop() {
        super.handleBuildingLoop();

        // add wood proportional to building level
        const oldManufacturedResource = this.planet.manufacturedResources.find(r => r.id === this.recipe.id);
        if (oldManufacturedResource) {
            // upgrade resources array
            oldManufacturedResource.amount = this.buildingLevel;
        } else {
            // add new resources array
            this.planet.manufacturedResources.push({
                ...this.recipe,
                amount: this.buildingLevel
            });
        }
    }
}

/**
 * A building which produces minerals.
 */
export class Mine extends Building {
    buildingType: EBuildingType = EBuildingType.MINE;

    public serialize(): ISerializedBuilding {
        return {
            buildingType: this.buildingType,
            buildingLevel: this.buildingLevel,
            upgradeProgress: this.upgradeProgress,
        };
    }

    public static deserialize(instance: Game, planet: Planet, data: ISerializedBuilding) {
        const item = new Mine(instance, planet);
        item.deserializeUpdate(data);
        return item;
    }

    public deserializeUpdate(data: ISerializedBuilding) {
        this.buildingType = data.buildingType;
        this.buildingLevel = data.buildingLevel;
        this.upgradeProgress = data.upgradeProgress;
    }

    getUpgradeCost(): number {
        // mine requires 2 minutes to begin upgrade
        return 2 * 60 * 10 * Math.pow(this.buildingLevel + 1, Math.sqrt(2));
    }

    handleBuildingLoop() {
        super.handleBuildingLoop();

        // add iron proportional to building level
        this.planet.iron += this.buildingLevel;
        this.planet.ironConstruction += this.buildingLevel;

        // add coal for steel forging
        this.planet.coal += this.buildingLevel;
        this.planet.coalConstruction += this.buildingLevel;

        // TODO: add add gems for jewelry, each island will have its own specific gem
        /**
         * Gems and Jewelry is required for treasure hunting. Islands will gather a specific gem, specific to each island.
         * Gems can be sold to jeweler who will create jewelry which will be stored into treasure piles. Treasure can
         * be traded or sold on market.
         *
         * Pirates will raid islands for Jewelry, gold, and resources.
         */

        // TODO: add marble
    }
}

/**
 * A building which produces wood.
 */
export class Blacksmith extends Building {
    buildingType: EBuildingType = EBuildingType.BLACKSMITH;

    public serialize(): ISerializedBuilding {
        return {
            buildingType: this.buildingType,
            buildingLevel: this.buildingLevel,
            upgradeProgress: this.upgradeProgress,
        };
    }

    public static deserialize(instance: Game, planet: Planet, data: ISerializedBuilding) {
        const item = new Blacksmith(instance, planet);
        item.deserializeUpdate(data);
        return item;
    }

    public deserializeUpdate(data: ISerializedBuilding) {
        this.buildingType = data.buildingType;
        this.buildingLevel = data.buildingLevel;
        this.upgradeProgress = data.upgradeProgress;
    }

    getUpgradeCost(): number {
        // blacksmith currently is not upgradable
        return Number.MAX_VALUE;
    }

    handleBuildingLoop() {
        super.handleBuildingLoop();

        // convert iron into iron cannon balls, weapons
        if (this.planet.cannons < 10 && this.planet.iron >= 40 && this.planet.coal >= 40) {
            this.planet.iron -= 40;
            this.planet.coal -= 40;
            this.planet.cannons += 1;
        } else if (this.planet.cannonades < 10 && this.planet.iron >= 10 && this.planet.coal >= 10) {
            this.planet.iron -= 10;
            this.planet.coal -= 10;
            this.planet.cannonades += 1;
        } else if (this.planet.cannons < 100 && this.planet.iron >= 40 && this.planet.coal >= 40) {
            this.planet.iron -= 40;
            this.planet.coal -= 40;
            this.planet.cannons += 1;
        } else if (this.planet.cannonades < 100 && this.planet.iron >= 10 && this.planet.coal >= 10) {
            this.planet.iron -= 10;
            this.planet.coal -= 10;
            this.planet.cannonades += 1;
        } else if (this.planet.cannons < 300 && this.planet.iron >= 40 && this.planet.coal >= 40) {
            this.planet.iron -= 40;
            this.planet.coal -= 40;
            this.planet.cannons += 1;
        }
    }
}

export interface ISerializedBuilding {
    buildingType: EBuildingType;
    buildingLevel: number;
    upgradeProgress: number;
}

export interface ISerializedShipyardDock {
    progress: number;
    shipCost: number;
    shipType: EShipType | null;
    sentDoneSignal: boolean;
}

export interface ISerializedShipyard extends ISerializedBuilding {
    docks: ISerializedShipyardDock[];
    numberOfDocks: number;
    numShipsAvailable: number;
    shipsAvailable: Record<EShipType, number>;
    shipsBuilding: Record<EShipType, number>;
}

export interface ISerializedPlantation extends ISerializedBuilding {
    resourceType: EResourceType;
}

export interface ISerializedManufactory extends ISerializedBuilding {
    recipe: IItemRecipe;
}

/**
 * A class which simulates the economy of an island.
 */
export class PlanetaryMoneyAccount {
    /**
     * The planet the economy is for.
     */
    public planet: Planet;
    /**
     * The currency of the planetary economy account. Each kingdom has it's own paper money. All kingdoms will respect
     * gold. Pirates which rob a ship with only paper money will either convert paper money or spend paper money in the
     * same place it committed the robbery at. Might be a fun mechanic, trying to pirate a ship, and sink it before being
     * reported, to then spend the money or find someone to convert the money.
     */
    public currencySystem: PlanetaryCurrencySystem;
    /**
     * The economy system for the planetary economy account. Store the sum of resources for each item in the kingdom.
     */
    public economySystem: PlanetaryEconomySystem;

    /**
     * The amount of gold coins ready to spend. Only used by gold.
     */
    public cash: MoneyAccount = new MoneyAccount();
    /**
     * The amount of gold coins reserved for taxes, back to the duke, king, or emperor. Only used by gold.
     */
    public taxes: MoneyAccount = new MoneyAccount();
    /**
     * The amount of gold coins held for reserve by the planetary government. Only used by gold.
     */
    public reserve: MoneyAccount = new MoneyAccount();
    /**
     * The amount of gold coins held by citizens after they are paid for their work.
     */
    public citizenCash: MoneyAccount = new MoneyAccount();
    /**
     * The demands of the citizens, changes the price of goods.
     */
    public citizenDemand: PlanetaryEconomyDemand;
    /**
     * A list of prices for each resource.
     */
    public resourcePrices: IMarketPrice[] = [];

    /**
     * The multiple per crate.
     */
    public static VALUE_MULTIPLE_PER_CRATE: number = 100;
    /**
     * The multiple per level of building on planet.
     */
    public static VALUE_MULTIPLE_PER_BUILDING_LEVEL: number = 1000;
    /**
     * The multiple per planet empty planet.
     */
    public static BASE_VALUE_PER_PLANET: number = 1000;

    public serialize(): ISerializedPlanetaryMoneyAccount {
        return {
            planetId: this.planet.id,
            cash: this.cash.serialize(),
            taxes: this.taxes.serialize(),
            reserve: this.reserve.serialize(),
            citizenCash: this.citizenCash.serialize(),
            citizenDemand: this.citizenDemand.serialize(),
            resourcePrices: this.resourcePrices
        };
    }

    public deserializeUpdate(data: ISerializedPlanetaryMoneyAccount) {
        this.cash.deserializeUpdate(data.cash);
        this.taxes.deserializeUpdate(data.taxes);
        this.reserve.deserializeUpdate(data.reserve);
        this.citizenCash.deserializeUpdate(data.citizenCash);
        this.citizenDemand.deserializeUpdate(data.citizenDemand);
        this.resourcePrices.splice(0, this.resourcePrices.length);
        this.resourcePrices.push.apply(this.resourcePrices, data.resourcePrices);
    }

    public static deserialize(instance: Game, planet: Planet, data: ISerializedPlanetaryMoneyAccount): PlanetaryMoneyAccount {
        const item = new PlanetaryMoneyAccount(planet, planet.currencySystem, planet.economySystem);
        item.deserializeUpdate(data);
        return item;
    }

    /**
     * Create a new planetary economy account;
     * @param planet The planet of the economy.
     * @param currencySystem The currency of the money account.
     * @param economySystem The economy of the money account.
     */
    constructor(planet: Planet, currencySystem: PlanetaryCurrencySystem, economySystem: PlanetaryEconomySystem) {
        this.planet = planet;
        this.currencySystem = currencySystem;
        this.economySystem = economySystem;
        this.citizenDemand = new PlanetaryEconomyDemand(this.planet);
    }

    /**
     * Economy update
     * ===
     * Below is a list of a requirements of the feudal economy of the game, "Globular Marauders". The goals of the
     * economy is to have inflationary effects and a mercantile mindset for fun. By keeping track of various data
     * about the currency, prices will go up and down randomly to simulate a working economy. Losing wars will result
     * in high prices or high taxes, stupidly printing money will result in higher taxes, Running out of gold will
     * hurt the empire.
     *
     * Properties of the ideal video game economy
     * ---
     * Gold is neither created or destroyed, only transferred, unless there's a gold mine.
     * Cash is neither created or destroyed in sales, unless it's grants from a victorious invasion or taxes.
     *
     * Kingdoms will try to pay players to colonize, pirate and invade.
     * - [ ] Kingdoms will create budget and tax plans
     * - [ ] Possible future, players can argue over tax plans in between battles
     * - [ ] Player republics might be fun
     * Kingdoms will try to pay AIs to colonize and trade.
     * Kingdoms will create schemes for world conquest by moving gold around.
     * Players will collect gold and cash for larger ships, royal titles, and a score board retirement.
     * Merchants will collect gold and cash for a citizens cash retirement on a planet.
     * Citizens will collect gold and cash for a making and buying things.
     *
     * Kingdom -> Player
     * ===
     * Players will capture planets will get rewarded with a grant, no taxes.
     * ---
     * Why? When expanding the empire, the
     * new subjects will need their own copy of the imperial currency, so new currency must be created or issued,
     * who better to issue newly minted imperial money to then the players which captured or colonized planets.
     * Loosing land will result in inflation.
     * - [X] Compute planet reward to determining surplus or deficit of currency
     * - [ ] Compute tax plan for planet deficits
     *   - Added taxes based on percentage for ships sold
     *
     * Players will pirate or trade cargo with taxable money.
     *  ---
     * This money will be included as part of the tax target in the future. Too much untaxed cargo will result
     * in inflation.
     * - [X] Compute resource reward to determine payment for cargo.
     * - [ ] Compute tax plan for cargo
     *
     * Savings goal
     * ---
     * Kingdoms are trying to keep as much money in reserve to pay merchants, pirates, and captains to do the empire
     * building. Kingdoms will determine an amount of gold to circulate and try to keep the rest in reserve. Kingdoms
     * will also institute tariff measures if their reserve gold is low.
     * - [ ] Create tariffs
     *
     * Kingdoms will issue cash (paper currency) and collect taxes, to destroy old cash. Their goal is to keep the
     * amount of circulation balanced to avoid inflation. A great way to cause inflation is to lose land, which results
     * in higher prices or higher taxes.
     * - [X] Create paper cash system
     *
     * Gold is based on the global conquest base line, what percentage of the world does the empire own, then distribute
     * that amount of gold.
     * - [X] Create gold system
     *
     * Cash is based on the price target base line, If prices are too low, distribute more money, if prices are too
     * high, try raising taxes (strange). For example:
     * 1. Kingdom captured a duchy (3 planets), 9 planets (kingdom) is now 12, need to expand currency by 12 / 9 to
     * keep the same constant price, or "give imperial money to new empire so they can use imperial money instead
     * of their original money".
     * 2. Kingdom lost a duchy (3 planets), 9 planets (kingdom) is now 6, need to tax away 3 / 9 of the money to
     * keep the same constant price, or "live with the high prices of a failed state". High prices will cause shortages
     * because players who could afford large ships now have to hold smaller ships, and pay the difference in taxes
     * until the economy returns to normal price level, or pay everyone more money but for less things. (weird).
     * 3. Gold on captured planets will transferred to their new owners so very little monetary balancing has to be
     * done.
     * 4. Losing land is very bad.
     *
     * Barter is part of feudal/colonial obligations, no money involved.
     * - [X] Create feudal obligation system
     *
     * Player -> Kingdom
     * ===
     * Players will buy repairs and ships from planets. Might also buy a title to a planet. Might help upgrade something
     * on the planet.
     *
     * Repairs are offered by planets which send taxes to the local ruler and the empire.
     * - [ ] Create repairs and modifications
     * Ships are offered by planets which send taxes to the local ruler and the empire.
     * - [ ] Create better ship prices, which are part tax plan, maybe K/D ratio can be used for tax bracket.
     * Titles are player own-able objects which can be purchased or given as a gift.
     * - Players which capture planets are given ownership
     * - [ ] Players can own planet and manage planet governance directives
     * - Players which colonize planets are given ownership
     * - When they leave the game, ownership is transferred to the empire
     * - [ ] Players which leave will transfer ownership to second in command
     *   - [ ] If they return before 30 minutes, they get ownership again
     *   - [ ] If they wait more than 30 minutes, second in command becomes official
     *   - [ ] If they're no players in succession, the empire receives ownership
     *   - [ ] The empire can gift or sell titles back to players
     * - Players can sell ownership to other players
     *   - [ ] Players can sell titles to other players or back to the empire
     *
     * Savings goal
     * ---
     * Players are saving money to own larger ships and collect titles. The highest title a player may own is king.
     * Maybe one day, players might be emperors which divide out gold.
     *
     * Kingdom -> Trader -> Kingdom
     * ===
     * Traders will use gold, cash, or barter to trade goods between planets.
     *
     * Gold
     * ---
     * Gold requires reserve, difficult to not run out of gold on one side. Need to keep trade balance. Running out of
     * gold will prevent people from buying. Traders traveling between kingdoms might use gold. One goal of the game
     * is to take all of the gold from a kingdom.
     *
     * Gold requires a trade plan to keep the trade balance unless the kingdom requires a resource it does not have,
     * then it will trade at a trade imbalance. Running out of gold will result in bad effects. No more mercenaries.
     * - [ ] Add gold traders which trade between empires, since gold is a universal transfer of value.
     *
     * Cash
     * ---
     * Cash can be generated as needed, but not enough product sold from Kingdom to Trader will result in too much cash.
     * People will buy too much, resulting in a shortage or increase prices.
     *
     * Cash does not require a trade plan to keep trade balance, When someone sells something to the economy, they
     * receive a cash payment which can be used to buy something from the other planet.
     * - [ ] Add cash traders which trade between gold less colonies, since colonies might share the same cash.
     * - [ ] Add international cash traders which perform cash conversions at a 50% profit.
     *   - Take 1000 cash and give 500 other cash,
     *     go to other kingdom,
     *     buy specific good,
     *     go back home,
     *     sell good for 1000 cash.
     *     - Useful for pirates who don't want to trade in foreign currency.
     *     - Maybe the gold traders are traveling between Kingdom capitals and empires
     *     - Maybe the cash traders are traveling within the kingdom.
     *     - More likely to run into a cash trader
     *       - Cargo sold for cash or gold
     *       - Cash sold for other cash or gold
     *       - Pirates spend cash and gold on rum to rank in the pirate leader boards
     *
     * Barter
     * ---
     * Barter trading resources without money, might be imbalanced towards one side, like a colonial system.
     *
     * Used for imperial tribute, trading without money with the advantage towards the empire.
     * - [X] Partially working, need to finish imperial tribute.
     *   - [X] Add feudal obligation ratio
     *
     * Royal Merchants
     * ---
     * Royal merchants are ships owned by the crown, which trade resources for profit for the crown. All profits
     * will go to the crown. Usually, the Royal merchants are limited to the imperial realm.
     * - [-] Partially working, Royal merchants should collect tribute and perform royal commerce.
     *   - [ ] Perform royal commerce.
     *
     * Independent Merchants
     * ---
     * Players or merchant ships of players which trade resources for profit, Independent merchants can trade across
     * imperial borders.
     * This will mean ships will not attack independent merchants unless the independent merchant damages them.
     * Independent merchants might cause gold deficits.
     * - [ ] Independent merchants
     * - [ ] Independent merchant fleets owned by players
     * - [ ] Merchants which escape from pirates should report piracy
     * - [ ] Pirates can disguise as independent merchants until their close enough to attack.
     * - [ ] Perform independent commerce.
     *
     * Savings goal
     * ---
     * Merchants want to collect money for retirement. When a merchant has enough money, they will sell their ship
     * and take all the cash they collected and put it into the citizens account.
     *  - [ ] Create merchant retirement once merchant reaches a specific amount of profit.
     *
     * Kingdom -> Citizens -> Kingdom
     * ===
     * Citizens are the local workers which produce goods and buy goods. Having more citizens will increase demand
     * and consumption.
     * Citizens also buy goods which increases the demand for traders, which increases the demand for pirates.
     *
     * Paying Citizens
     * ---
     * You pay citizens to work. With money, citizens will work. Gold not necessary, cash payments is good enough.
     * - [ ] Money goes into citizens bank account for their work
     *
     * Citizens with money will accumulate a set of desires for products, citizens will always have food, but the
     * desire is for luxuries such as coffee, tea, furs, rum. This means each planet should have a desire counter
     * which ticks up in time and once a desire has been satisfied, it resets. The money paid for a desire is
     * the Dirichlet of desire multiplied by the total citizen money. Dirichlet is a list of probabilities between
     * 0 and 1 summing to 1. [0.2, 0.2, 0.2, 0.2, 0.2] is a Dirichlet distribution. Traders will queue the best
     * to worse probabilities.
     * - [ ] Implement citizen desire class which keeps track of desire/demand
     * - [ ] Merchants will pick the largest desire and trade, largest desire will provide the most profit.
     *
     * Selling Goods
     * ---
     * Citizens will use the money they accumulated to buy cargo, sold by traders. Citizens will demand a diverse
     * set of goods. Traders will collect the most desired good in the order of desire.
     *
     * Citizens will get paid for 1/2, 1/3, 1/4, 1/5 the value of the final product. This money will go into the
     * citizens bank account. Payment happens once a trade happens.
     *
     * This means merchants must know the amount of resources to buy, to pay the kingdom, to pay the citizens, so the
     * kingdom can give the goods to the merchant, which will return to their original port, to sell the good, to
     * collect payment and profit.
     *
     * Savings goal
     * ---
     * Citizens want to work to collect money to spend it on luxuries.
     * Kingdom cash -> Citizens cash -> Kingdom cash / Merchant profit -> Citizens cash / Merchant Retirement.
     * Feels like kingdoms might run out of money somehow.
     * - [ ] Poor planets will offer merchants a good retirement to attract large lump sums of money. Last ditch
     *       attempt at balancing the economy of an empire. Imagine the poor planet offering more land acres than
     *       a rich planet, some people might prefer more land then expensive city accommodations.
     *
     * Feudal and Market ratio
     * ===
     * Feudal lords can set a ratio between 1/2, 1/3, 1/4, 1/5 of feudal obligations of their vassals, which must send
     * raw goods to the feudal lord. Count -> Duke -> King -> Emperor.
     *
     * At a 1 / 3rd feudal obligation.
     * Counts get 1 resource,  keep 2 / 3 of resources, 0.66.
     * Duke get (3 / 3) + 2 * (1 / 3) = 5 / 3 of resources, keep 10 / 9 of resources, 1.11.
     * King get (3 / 3) + 2 * (1 / 3) + 2 * (5 / 9) = 25 / 9 of resources, keep 50 / 27 of resources, 1.85.
     * Emperor get (3 / 3) + 2 * (1 / 3) + 2 * (5 / 9) + 2 * (25 / 27) = 125 / 27 of resources, 4.63.
     * - [X] Add feudal obligations
     *
     * Royal Merchants
     * ---
     * Resources acquired through feudal obligation can be used to collect money from citizens across the empire as
     * a second form of tax.
     */

    /**
     * --------------------------------------------------------------------------------------------------------------
     * The following section is dedicated to rewarding players for capturing cargo and planets. This is money
     * moving from kingdom to players. Need to compute taxes which is money from players to kingdoms.
     * --------------------------------------------------------------------------------------------------------------
     */
    /**
     * The intrinsic value of a resource.
     * @param resourceType The resource type to check.
     */
    public computeValueForResourceType(resourceType: EResourceType): number {
        const itemData = ITEM_DATA.find(i => i.resourceType === resourceType);
        if (!itemData) {
            throw new Error("Could not find Resource Type");
        }
        return itemData.basePrice;
    }

    /**
     * The prices of the game is based on monetary theory which accounts for inflation and deflation.
     * The formula is M * V = P * Q (money * velocity multiplier = price * quantity). A new price
     * can be computed based on (price = money * velocity multiplier / quantity). Attacking supply will lower the denominator
     * which will cause price to increase. Issuing more money via quests and not enough taxes will also cause money to
     * increase which will increase the price. To decrease price, more taxes or more supply is needed. In theory, areas
     * with more supply (lower prices) will transfer goods to areas with less supply (higher prices). Medieval embargoes,
     * medieval hoarding, and medieval price gouging might be an amusing mechanic.
     *
     * Note: DO NOT FORGET THAT LUXURY BUFFS CAN BE PERCENTAGES OF THE PRICE. REPLENISHING 90% of 100 is 90 gold.
     */
    public computePriceForResourceType(resourceType: EResourceType) {
        const supplySide = (
            this.currencySystem.globalAmount *
            this.computeValueForResourceType(resourceType) *
            PlanetaryMoneyAccount.VALUE_MULTIPLE_PER_CRATE
        ) / (
            this.economySystem.getEconomyValueSum()
        );
        const demandSide = this.citizenDemand.getDemandMultiplierForResource(resourceType);
        return Math.ceil(supplySide * demandSide);
    }

    /**
     * The prices of the game is based on monetary theory which accounts for inflation and deflation.
     * The formula is M * V = P * Q (money * velocity multiplier = price * quantity). A new price
     * can be computed based on (price = money * velocity multiplier / quantity). Attacking supply will lower the denominator
     * which will cause price to increase. Issuing more money via quests and not enough taxes will also cause money to
     * increase which will increase the price. To decrease price, more taxes or more supply is needed. In theory, areas
     * with more supply (lower prices) will transfer goods to areas with less supply (higher prices). Medieval embargoes,
     * medieval hoarding, and medieval price gouging might be an amusing mechanic.
     *
     * Note: DO NOT FORGET THAT LUXURY BUFFS CAN BE PERCENTAGES OF THE PRICE. REPLENISHING 90% of 100 is 90 gold.
     */
    public computePriceForResourceTypeInForeignCurrency(resourceType: EResourceType, currencySystem: PlanetaryCurrencySystem) {
        const supplySide = (
            currencySystem.globalAmount *
            this.computeValueForResourceType(resourceType) *
            PlanetaryMoneyAccount.VALUE_MULTIPLE_PER_CRATE
        ) / (
            this.economySystem.getEconomyValueSum()
        );
        const demandSide = this.citizenDemand.getDemandMultiplierForResource(resourceType);
        return Math.ceil(supplySide * demandSide);
    }

    /**
     * Determine price for a planet.
     * @param planet
     */
    public computePriceForPlanet(planet: Planet) {
        return Math.ceil(
            (
                this.currencySystem.globalAmount *
                this.economySystem.getPlanetUnitValue(planet)
            ) / (
                this.economySystem.getEconomyValueSum()
            )
        );
    }

    /**
     * Determine the reward amount for a set of captured planets. Useful for invasion forces. Kingdoms will reward
     * captains using this formula.
     */
    public determineRewardAmountFromPlanets(planets: Planet[]) {
        let sum = 0;
        for (const planet of planets) {
            sum += this.computePriceForPlanet(planet);
        }
        return Math.ceil(sum);
    }

    /**
     * Determine the reward amount for a set of captured cargo. Useful for pirates. Kingdoms will reward pirates
     * using this formula.
     * @param resources
     */
    public determineRewardAmountFromResources(resources: ICargoItem[]) {
        let sum = 0;
        for (const resource of resources) {
            sum += this.computePriceForResourceType(resource.resourceType) * resource.amount;
        }
        return Math.ceil(sum);
    }

    /**
     * --------------------------------------
     * The following section is for payments
     * --------------------------------------
     */

    /**
     * Pay for something on a planet with taxes.
     * @param account The money account to transfer from.
     * @param other The other money account to use.
     * @param payment The payment to make.
     * @param taxes The percent tax between 0 and 1.
     */
    public static MakePaymentWithTaxes(account: MoneyAccount, other: PlanetaryMoneyAccount, payment: ICurrency[], taxes: number = 0) {
        const taxesPayment = payment.map(p => ({currencyId: p.currencyId, amount: Math.ceil(p.amount * taxes)}));
        const profitPayment = payment.reduce((acc, p) => {
            const taxes = taxesPayment.find(t => t.currencyId === p.currencyId);
            if (taxes && p.amount > taxes.amount) {
                acc.push({
                    currencyId: p.currencyId,
                    amount: p.amount - taxes.amount
                });
            }
            return acc;
        }, [] as ICurrency[]);
        account.makePayment(other.taxes, taxesPayment);
        account.makePayment(other.cash, profitPayment);
    }

    /**
     * --------------------------------------------------------------------------------------------------------------
     * The following section is for market prices. Determining which ships go between which planets, carrying stuff.
     * --------------------------------------------------------------------------------------------------------------
     */
    /**
     * Compute the new market prices for the planet.
     */
    computeNewMarketPrices() {
        this.resourcePrices.splice(0, this.resourcePrices.length);
        for (const resourceType of Object.values(EResourceType)) {
            this.resourcePrices.push({
                resourceType,
                price: this.computePriceForResourceType(resourceType),
            });
        }
    }

    /**
     * ---------------------------------------
     * The game loop of the planetary economy
     * ---------------------------------------
     */

    public handlePlanetaryEconomy() {
        this.citizenDemand.handleEconomyDemand();
        this.computeNewMarketPrices();
    }
}