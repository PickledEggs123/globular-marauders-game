import {CONSUMABLE_RESOURCES, EResourceType} from "./Resource";
import {Game} from "./Game";
import {EBuildingType, Manufactory} from "./Building";
import {Planet} from "./Planet";
import {IMarketPrice} from "./Market";
import {ISerializedMoneyAccount} from "./MoneyAccount";

export interface IEconomyDemand {
    resourceType: EResourceType;
    amount: number;
}

export interface ISerializedPlanetaryEconomyDemand {
    planetId: string;
    demands: IEconomyDemand[];
    demandTick: number;
}

/**
 * Compute the demand of a planet over time.
 */
export class PlanetaryEconomyDemand {
    planet: Planet;

    demands: IEconomyDemand[] = [];

    demandTick: number = 0;

    public static DEMAND_TICK_COOL_DOWN: number = 60 * 10;

    public serialize(): ISerializedPlanetaryEconomyDemand {
        return {
            planetId: this.planet.id,
            demands: this.demands,
            demandTick: this.demandTick,
        };
    }

    public deserializeUpdate(data: ISerializedPlanetaryEconomyDemand) {
        this.demands.splice(0, this.demands.length);
        this.demands.push.apply(this.demands, data.demands);

        this.demandTick = data.demandTick;
    }

    public static deserialize(instance: Game, data: ISerializedPlanetaryEconomyDemand): PlanetaryEconomyDemand {
        const planet = instance.planets.get(data.planetId);
        if (!planet) {
            throw new Error("Could not find planet");
        }

        const item = new PlanetaryEconomyDemand(planet);
        item.deserializeUpdate(data);
        return item;
    }

    constructor(planet: Planet) {
        this.planet = planet;
        for (const resourceType of Object.values(EResourceType)) {
            this.demands.push({
                resourceType,
                amount: 0
            });
        }
    }

    isDemandTick(): boolean {
        if (this.demandTick <= 0) {
            this.demandTick = PlanetaryEconomyDemand.DEMAND_TICK_COOL_DOWN;
            return true;
        } else {
            this.demandTick -= 1;
            return false;
        }
    }

    handleEconomyDemand() {
        // increase demand over time based on settlement progress / population
        if (this.isDemandTick()) {
            const manufactories = this.planet.buildings.filter(b => b.buildingType === EBuildingType.MANUFACTORY);
            for (const demand of this.demands) {
                // reset demand
                demand.amount = 0;

                // add demand for consumables
                if (CONSUMABLE_RESOURCES.includes(demand.resourceType)) {
                    demand.amount += this.planet.settlementProgress;
                }

                // add demand for industrial ingredients
                for (const b of manufactories) {
                    if (b instanceof Manufactory) {
                        const m = b as Manufactory;
                        const ingredient = m.recipe.ingredients.find(i => i.resourceType === demand.resourceType);
                        if (ingredient) {
                            demand.amount += ingredient.amount * m.buildingLevel;
                        }
                    }
                }
            }
        }
    }

    getDemandMultiplierForResource(resourceType: EResourceType) {
        const demand = this.demands.find(d => d.resourceType === resourceType);
        if (demand) {
            return Math.log(demand.amount + 1) / Math.log(3);
        } else {
            return 0;
        }
    }
}

export interface ISerializedPlanetaryMoneyAccount {
    planetId: string;
    cash: ISerializedMoneyAccount;
    taxes: ISerializedMoneyAccount;
    reserve: ISerializedMoneyAccount;
    citizenCash: ISerializedMoneyAccount;
    citizenDemand: ISerializedPlanetaryEconomyDemand;
    resourcePrices: IMarketPrice[];
}