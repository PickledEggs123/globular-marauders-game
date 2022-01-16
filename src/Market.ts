import {EResourceType} from "./Resource";
import {Game} from "./Game";
import {EDirectedMarketTradeDirection, EServerType, IDirectedMarketTrade} from "./Interface";
import {Planet} from "./Planet";

/**
 * The price of a resource on that planet. Used to determine the market prices of each resource.
 * A market class will be used to find the best deals within the area.
 */
export interface IMarketPrice {
    resourceType: EResourceType;
    price: number;
}

/**
 * Class used to determine which planets to buy resources from. Used by each planet to determine where to buy stuff.
 */
export class Market {
    /**
     * Used to get a list of planets near the current planet.
     * @param planet
     */
    static* GetPlanetsWithinNeighborhood(planet: Planet): Generator<Planet> {
        const planetKingdom = planet.county.duchy.kingdom;
        for (const neighborKingdom of planetKingdom.neighborKingdoms) {
            yield* neighborKingdom.getPlanets();
        }
    }

    /**
     * Used to determine which planets to buy a resource from, for the cheapest price.
     * @param planet
     * @param resourceType
     * @returns A sorted list of the highest profit to lowest profit trade routes.
     */
    static GetLowestPriceForResource(planet: Planet, resourceType: EResourceType): Array<[number, Planet]> {
        if (!planet.currencySystem) {
            throw new Error("Could not find currency system to compute prices in");
        }

        const neighborhoodPlanets = Array.from(Market.GetPlanetsWithinNeighborhood(planet));

        // get best planet and lowest price
        const profits: Array<[number, Planet]> = [];
        for (const neighborPlanet of neighborhoodPlanets) {
            if (neighborPlanet.moneyAccount) {
                const price = neighborPlanet.moneyAccount.computePriceForResourceTypeInForeignCurrency(resourceType, planet.currencySystem);
                if (price > 0) {
                    profits.push([price, neighborPlanet]);
                }
            }
        }
        return profits;
    }

    static GetBiggestPriceDifferenceInImportsForPlanet(homePlanet: Planet): Array<[EResourceType, number, Planet]> {
        // get best resource, planet, and profit
        const profitableResources: Array<[EResourceType, number, Planet]> = [];
        for (const resourceType of Object.values(EResourceType)) {
            // get best planet and profit for resource
            const profits = Market.GetLowestPriceForResource(homePlanet, resourceType);
            for (const [price, planet] of profits) {
                profitableResources.push([resourceType, price, planet]);
            }
        }
        return profitableResources;
    }

    static ComputeProfitableTradeDirectedGraph(instance: Game) {
        // setup best profitable trades for the entire game
        if ([EServerType.STANDALONE, EServerType.PHYSICS_NODE].includes(instance.serverType)) {
            for (const [, planet] of instance.planets) {
                if (planet.moneyAccount) {
                    planet.bestProfitableTrades = Market.GetBiggestPriceDifferenceInImportsForPlanet(planet).slice(0, 30);
                }
            }
        }

        // compute a directed edge graph of the trades
        if ([EServerType.STANDALONE, EServerType.PHYSICS_NODE].includes(instance.serverType)) {
            for (const [, a] of instance.planets) {
                for (const [, b] of instance.planets) {
                    const data = [] as Array<IDirectedMarketTrade>;
                    for (const [resourceType, profit, planet] of a.bestProfitableTrades) {
                        if (planet.id === b.id) {
                            data.push({
                                tradeDirection: EDirectedMarketTradeDirection.TO,
                                resourceType,
                                profit,
                            });
                        }
                    }
                    for (const [resourceType, profit, planet] of b.bestProfitableTrades) {
                        if (planet.id === a.id) {
                            data.push({
                                tradeDirection: EDirectedMarketTradeDirection.FROM,
                                resourceType,
                                profit,
                            });
                        }
                    }
                    instance.directedMarketTrade[`${a.id}#${b.id}`] = data;
                }
            }
        }

        // compute possible trade deals, pair each directed edge into a series of bilateral trade deals
        if ([EServerType.STANDALONE, EServerType.PHYSICS_NODE].includes(instance.serverType)) {
            for (const [, planet] of instance.planets) {
                planet.possibleTradeDeals = [];
            }
        }
        if ([EServerType.STANDALONE, EServerType.PHYSICS_NODE].includes(instance.serverType)) {
            for (const [, a] of instance.planets) {
                for (const [, b] of instance.planets) {
                    const data = instance.directedMarketTrade[`${a.id}#${b.id}`];
                    const toTrades = data.filter(t => t.tradeDirection === EDirectedMarketTradeDirection.TO);
                    const fromTrades = data.filter(t => t.tradeDirection === EDirectedMarketTradeDirection.FROM);
                    for (const toTrade of toTrades) {
                        for (const fromTrade of fromTrades) {
                            a.possibleTradeDeals.push({
                                toResourceType: toTrade.resourceType,
                                fromResourceType: fromTrade.resourceType,
                                profit: toTrade.profit + fromTrade.profit,
                                planet: b,
                            });
                            b.possibleTradeDeals.push({
                                toResourceType: fromTrade.resourceType,
                                fromResourceType: toTrade.resourceType,
                                profit: toTrade.profit + fromTrade.profit,
                                planet: a,
                            });
                        }
                    }
                }
            }
        }
        if ([EServerType.STANDALONE, EServerType.PHYSICS_NODE].includes(instance.serverType)) {
            for (const [, planet] of instance.planets) {
                planet.possibleTradeDeals.sort((a, b) => a.profit - b.profit);
            }
        }
    }
}