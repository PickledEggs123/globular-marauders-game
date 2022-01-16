import {Game} from "./Game";
import {PlanetaryMoneyAccount} from "./Building";
import {EResourceType} from "./Resource";
import {IResourceExported, Planet} from "./Planet";

export interface ISerializedPlanetaryEconomySystem {
    resources: Array<IResourceExported>;
    resourceUnitSum: number;
    planetIds: string[];
}

/**
 * A class which stores how many goods are in the economy of a planet, duchy, kingdom, or empire.
 */
export class PlanetaryEconomySystem {
    instance: Game;
    /**
     * The resources of an economy.
     */
    resources: Array<IResourceExported> = [];
    /**
     * The sum of resource unit value.
     */
    resourceUnitSum: number = 0;
    /**
     * The planets of an economy.
     */
    planets: Planet[] = [];

    public serialize(): ISerializedPlanetaryEconomySystem {
        return {
            resources: this.resources,
            resourceUnitSum: this.resourceUnitSum,
            planetIds: this.planets.map(p => p.id)
        };
    }

    public deserializeUpdate(data: ISerializedPlanetaryEconomySystem) {
        this.resources.splice(0, this.resources.length);
        this.resources.push.apply(this.resources, data.resources);

        this.resourceUnitSum = data.resourceUnitSum;

        this.planets.splice(0, this.planets.length);
        this.planets.push.apply(this.planets, data.planetIds.map(planetId => {
            return this.instance.planets.get(planetId) || null;
        }).filter(p => !!p));
    }

    public static deserialize(instance: Game, data: ISerializedPlanetaryEconomySystem): PlanetaryEconomySystem {
        const item = new PlanetaryEconomySystem(instance);
        item.deserializeUpdate(data);
        return item;
    }

    constructor(instance: Game) {
        this.instance = instance;
    }

    /**
     * Add a resource to the economy.
     */
    addResource(resource: IResourceExported) {
        this.resources.push(resource);
        this.resourceUnitSum += resource.amount;
    }

    /**
     * Remove all resources from the economy.
     */
    clearResources() {
        this.resources.splice(0, this.resources.length);
        this.resourceUnitSum = 0;
    }

    /**
     * Recompute the resources of a planet.
     */
    recomputeResources() {
        this.clearResources();
        for (const planet of this.planets) {
            for (const marketResource of planet.marketResources) {
                this.addResource(marketResource);
            }
        }
    }

    /**
     * Add a planet to the economy.
     * @param planet
     */
    addPlanet(planet: Planet) {
        this.planets.push(planet);
    }

    /**
     * Remove a planet from the economy.
     * @param planet The planet to remove.
     */
    removePlanet(planet: Planet) {
        const index = this.planets.findIndex(p => p === planet);
        if (index >= 0) {
            this.planets.splice(index, 1);
        }
    }

    /**
     * Get the unit value of a planet.
     * @param planet
     */
    getPlanetUnitValue(planet: Planet): number {
        return PlanetaryMoneyAccount.BASE_VALUE_PER_PLANET +
            planet.buildings.reduce((acc, building) => {
                return acc + building.buildingLevel * PlanetaryMoneyAccount.VALUE_MULTIPLE_PER_BUILDING_LEVEL;
            }, 0);
    }

    /**
     * Get the number of planet units in an economy.
     */
    getPlanetUnitValueSum(): number {
        return this.planets.reduce((acc, planet) => {
            return acc + this.getPlanetUnitValue(planet);
        }, 0);
    }

    /**
     * Determine the supply of a resource.
     * @param resourceType
     */
    getResourceTypeValueSum(resourceType: EResourceType): number {
        const v = this.resources.reduce((acc, r) => r.resourceType === resourceType ? acc + r.amount : acc, 0);
        return 0.2 + v * 0.2;
    }

    /**
     * Determine the supply of all resources.
     */
    getResourceTypesValueSum(): number {
        let sum = 0;
        for (const resourceType of Object.values(EResourceType)) {
            sum += this.getResourceTypeValueSum(resourceType);
        }
        return sum;
    }

    /**
     * Get the sum of the economy.
     */
    getEconomyValueSum(): number {
        return this.getPlanetUnitValueSum() + this.getResourceTypesValueSum();
    }
}