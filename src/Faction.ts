import {EResourceType} from "./Resource";
import {EFaction, EShipType, Ship} from "./Ship";
import {Planet} from "./Planet";
import {Game} from "./Game";

export enum ERoyalRank {
    EMPEROR = "EMPEROR",
    KING = "KING",
    DUKE = "DUKE",
    COUNT = "COUNT",
    UNCLAIMED = "UNCLAIMED",
}

/**
 * A special buff applied to factions when they accumulate luxuries.
 */
export class LuxuryBuff {
    public instance: Game;
    public faction: Faction;
    public planet: Planet;
    public resourceType: EResourceType;
    public planetId: string;
    public amount: number;
    private expires: number = 10 * 60 * 10;
    private ticks: number = 0;

    constructor(instance: Game, faction: Faction, planet: Planet, resourceType: EResourceType, planetId: string, amount: number) {
        this.instance = instance;
        this.faction = faction;
        this.planet = planet;
        this.resourceType = resourceType;
        this.planetId = planetId;
        this.amount = amount;
    }

    /**
     * Increment the buff.
     */
    public handleLuxuryBuffLoop() {
        this.ticks += 1;
    }

    /**
     * Find a matching luxury buff.
     * @param resourceType
     * @param planetId
     */
    public matches(resourceType: EResourceType, planetId: string) {
        return this.resourceType === resourceType && this.planetId === planetId;
    }

    /**
     * Reset the buff timer. Returns an amount replenished. Replenishing will reward the captain with money.
     */
    public replenish() {
        const percentReplenished: number = this.ticks / this.expires;
        this.ticks = 0;
        return percentReplenished;
    }

    /**
     * The buff expired.
     */
    public expired() {
        return this.ticks >= this.expires;
    }

    /**
     * Remove the buff.
     */
    public remove() {
        // remove from app
        const indexInApp = this.instance.luxuryBuffs.findIndex(l => l === this);
        if (indexInApp >= 0) {
            this.instance.luxuryBuffs.splice(indexInApp, 1);
        }
        // remove from planet
        const indexInPlanet = this.planet.luxuryBuffs.findIndex(l => l === this);
        if (indexInPlanet >= 0) {
            this.planet.luxuryBuffs.splice(indexInPlanet, 1);
        }
    }
}

/**
 * A list of which planet is owned by which player.
 */
export interface IFactionPlanetRoster {
    factionId: EFaction;
    kingdomId: string;
    duchyId: string;
    countyId: string;
    playerId: string;
}

/**
 * A pair of planetId and playerId;
 */
export interface IPlanetPlayerPair {
    planetId: string;
    playerId: string;
}

/**
 * A list showing the imperial ranks of all faction players.
 */
export interface IFactionPlayerRoyalTitles {
    counts: IPlanetPlayerPair[];
    barons: IPlanetPlayerPair[];
    dukes: IPlanetPlayerPair[];
    archDukes: IPlanetPlayerPair[];
    kings: IPlanetPlayerPair[];
    emperors: IPlanetPlayerPair[];
}

export interface ISerializedFaction {
    id: EFaction;
    factionColor: string;
    homeWorldPlanetID: string;
    planetIds: string[];
    factionPlanetRoster: IFactionPlanetRoster[];
    factionPlayerRoyalTitles: IFactionPlayerRoyalTitles;
    shipIds: string[];
    shipsAvailable: Record<EShipType, number>;
}

/**
 * A class representing a faction in the game world. Responsible for building boats, setting up trade, and colonizing islands.
 */
export class Faction {
    /**
     * An instance of app to retrieve faction data.
     */
    public instance: Game;
    /**
     * The id of the faction.
     */
    public id: EFaction;
    /**
     * The color of the faction.
     */
    public factionColor: string;
    /**
     * The home world planet id.
     */
    public homeWorldPlanetId: string;
    /**
     * A list of planet ids of planets owned by this faction.
     */
    public planetIds: string[] = [];
    /**
     * A list of planet ids owned by players in this faction.
     */
    public factionPlanetRoster: IFactionPlanetRoster[] = [];
    /**
     * A list of player ranks by planets owned.
     */
    public factionPlayerRoyalTitles: IFactionPlayerRoyalTitles = {
        counts: [],
        barons: [],
        dukes: [],
        archDukes: [],
        kings: [],
        emperors: []
    };
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
        [EShipType.FRIGATE]: 0
    };

    public serialize(): ISerializedFaction {
        return {
            id: this.id,
            factionColor: this.factionColor,
            homeWorldPlanetID: this.homeWorldPlanetId,
            planetIds: this.planetIds,
            factionPlanetRoster: this.factionPlanetRoster,
            factionPlayerRoyalTitles: this.factionPlayerRoyalTitles,
            shipIds: this.shipIds,
            shipsAvailable: this.shipsAvailable
        };
    }

    public deserializeUpdate(data: ISerializedFaction) {
        this.id = data.id;
        this.factionColor = data.factionColor;
        this.homeWorldPlanetId = data.homeWorldPlanetID;
        this.planetIds = [...data.planetIds];
        this.factionPlanetRoster = [...data.factionPlanetRoster];
        this.factionPlayerRoyalTitles = {...data.factionPlayerRoyalTitles};
        this.shipIds = [...data.shipIds];
        this.shipsAvailable = {...data.shipsAvailable};
    }

    public static deserialize(game: Game, data: ISerializedFaction): Faction {
        const item = new Faction(game, data.id, data.factionColor, data.homeWorldPlanetID);
        item.deserializeUpdate(data);
        return item;
    }

    /**
     * A number which produces unique ship id names.
     * @private
     */
    private shipIdAutoIncrement: number = 0;

    public static MAX_SHIPS: number = 100;

    public getShipAutoIncrement(): number {
        return this.shipIdAutoIncrement++;
    }

    /**
     * Create a new faction.
     * @param instance The app which contains data for the faction to process.
     * @param id The id of the faction.
     * @param factionColor The color of the faction.
     * @param homeWorldPlanetId The home world of the faction.
     */
    constructor(instance: Game, id: EFaction, factionColor: string, homeWorldPlanetId: string) {
        this.instance = instance;
        this.id = id;
        this.factionColor = factionColor;
        this.homeWorldPlanetId = homeWorldPlanetId;
        this.planetIds.push(homeWorldPlanetId);
    }

    /**
     * Faction AI loop.
     */
    public handleFactionLoop() {
        // recompute player titles from planets owned.

        // counts
        this.factionPlayerRoyalTitles.counts = this.factionPlanetRoster.filter(p => p.playerId !== null).map((i) => ({
            playerId: i.playerId,
            planetId: i.countyId,
        }));

        // baron and dukes
        const expandedCounts = this.factionPlanetRoster.reduce((acc, i) => {
            const oldItem = acc.find(item => item.kingdomId === i.kingdomId && item.duchyId === i.duchyId && item.playerId === i.playerId);
            if (oldItem) {
                oldItem.count += 1;
            } else {
                acc.push({
                    kingdomId: i.kingdomId,
                    duchyId: i.duchyId,
                    playerId: i.playerId,
                    count: 1,
                });
            }
            return acc;
        }, [] as Array<{kingdomId: string, duchyId: string, playerId: string, count: number}>);
        this.factionPlayerRoyalTitles.barons = expandedCounts.filter((i) => {
            return i.count >= 2 && i.count < 3;
        }).map((i) => ({
            planetId: i.duchyId,
            playerId: i.playerId,
        }));
        this.factionPlayerRoyalTitles.dukes = expandedCounts.filter((i) => {
            return i.count >= 3;
        }).map((i) => ({
            planetId: i.duchyId,
            playerId: i.playerId,
        }));

        // arch dukes and kings
        const expandedDukes = this.factionPlayerRoyalTitles.dukes.map((i) => ({
            kingdomId: this.instance.planets.find(p => p.id === i.planetId).county.duchy.kingdom.capital.capital.capital.id,
            duchyId: i.planetId,
            playerId: i.playerId,
        })).reduce((acc, i) => {
            const oldItem = acc.find(item => item.kingdomId === i.kingdomId && item.playerId === i.playerId);
            if (oldItem) {
                oldItem.domainCount += 1;
            } else {
                acc.push({
                    kingdomId: i.kingdomId,
                    playerId: i.playerId,
                    domainCount: 1
                });
            }
            return acc;
        }, [] as Array<{kingdomId: string, playerId: string, domainCount: number}>).map((i): {kingdomId: string, playerId: string, domainCount: number, capitalCount: number} => {
            const capitalCount = this.factionPlanetRoster.filter(p => p.playerId === i.playerId && p.kingdomId === i.kingdomId).filter(p => {
                const planet = this.instance.planets.find(pl => pl.id === p.countyId);
                if (planet) {
                    return planet.isDuchyCapital();
                } else {
                    return false;
                }
            }).length;
            return {
                kingdomId: i.kingdomId,
                playerId: i.playerId,
                domainCount: i.domainCount,
                capitalCount,
            };
        });
        this.factionPlayerRoyalTitles.archDukes = expandedDukes.filter((i) => {
            return i.domainCount >= 1 && i.capitalCount >= 1 && i.capitalCount < 2;
        }).map((i) => ({
            planetId: i.kingdomId,
            playerId: i.playerId,
        }));
        this.factionPlayerRoyalTitles.kings = expandedDukes.filter((i) => {
            return i.domainCount >= 1 && i.capitalCount >= 2;
        }).map((i) => ({
            planetId: i.kingdomId,
            playerId: i.playerId,
        }));

        // emperors
        const expandedKings = this.factionPlayerRoyalTitles.kings.map((i) => ({
            kingdomId: i.planetId,
            playerId: i.playerId,
        })).reduce((acc, i) => {
            const oldItem = acc.find(item => item.playerId === i.playerId);
            if (oldItem) {
                oldItem.domainCount += 1;
            } else {
                acc.push({
                    playerId: i.playerId,
                    domainCount: 1
                });
            }
            return acc;
        }, [] as Array<{playerId: string, domainCount: number}>).map((i): {playerId: string, domainCount: number, capitalCount: number} => {
            const capitalCount = this.factionPlanetRoster.filter(p => p.playerId === i.playerId).filter(p => {
                const planet = this.instance.planets.find(pl => pl.id === p.countyId);
                if (planet) {
                    return planet.isKingdomCapital();
                } else {
                    return false;
                }
            }).length;
            return {
                playerId: i.playerId,
                domainCount: i.domainCount,
                capitalCount,
            };
        });
        this.factionPlayerRoyalTitles.emperors = expandedKings.filter((i) => {
            return i.domainCount >= 1 && i.capitalCount >= 1;
        }).map((i) => ({
            planetId: this.homeWorldPlanetId,
            playerId: i.playerId,
        }));
    }

    public handleShipDestroyed(ship: Ship) {
        // remove ship from faction registry
        const shipIndex = this.shipIds.findIndex(s => s === ship.id);
        if (shipIndex >= 0) {
            this.shipIds.splice(shipIndex, 1);
        }
        this.shipsAvailable[ship.shipType] -= 1;
    }
}