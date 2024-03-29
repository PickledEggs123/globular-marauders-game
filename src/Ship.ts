import {
    EAutomatedShipBuffType,
    EFormEmitterType,
    EFormFieldType,
    EServerType,
    EShardMessageType,
    IAutomatedShip,
    IAutomatedShipBuff,
    ICameraState,
    ICharacterSelectionItem,
    IDamageScoreShardMessage,
    IFormCard,
    IFormRequest
} from "./Interface";
import Quaternion from "quaternion";
import {EResourceType, ICargoItem} from "./Resource";
import {EOrderResult, EOrderType, ISerializedOrder, Order} from "./Order";
import {DelaunayGraph, ISerializedPathFinder, PathFinder, VoronoiGraph} from "./Graph";
import {computeConeLineIntersection, IConeHitTest} from "./Intersection";
import {Faction} from "./Faction";
import {CannonBall, Crate, DeserializeQuaternion, ISerializedQuaternion, SerializeQuaternion, SpellBall} from "./Item";
import {IResourceExported, Planet} from "./Planet";
import {ESoundEventType, ESoundType, Game} from "./Game";
import {EShipType, GetShipData} from "./ShipType";
import {EFaction, ERaceData, GameFactionData, IClassData} from "./EFaction";
import {ISerializedMoneyAccount, MoneyAccount} from "./MoneyAccount";
import {PlanetaryMoneyAccount} from "./Building";
import {Character, CharacterBattle, ISerializedCharacter} from "./Character";

export enum EShipFormActions {
    BEGIN_BOARDING = "BEGIN_BOARDING",
}

/**
 * A list of different ship actions the player or AI can queue.
 */
export enum EShipActionItemType {
    /**
     * Shoot a fireball that does 5 times damage.
     */
    FIREBALL = "FIREBALL",
    /**
     * Shoot a cloud of sleepiness at a ship to disable it.
     */
    SLEEP = "SLEEP",
    /**
     * Take half as much damage.
     */
    IRONWOOD = "IRONWOOD",
}

export interface ISerializedShipActionItem {
    id: string;
    actionType: EShipActionItemType;
    direction: [number, number, number];
}

export interface ISerializedShip {
    id: string;
    shipType: EShipType;
    faction: EFaction | null;
    planetId: string | null;
    color: string;
    position: ISerializedQuaternion;
    positionVelocity: ISerializedQuaternion;
    orientation: ISerializedQuaternion;
    orientationVelocity: ISerializedQuaternion;
    cannonLoading?: Date;
    cannonCoolDown: number;
    cannonadeCoolDown: number[];
    activeKeys: string[];
    pathFinding: ISerializedPathFinder;
    fireControl: ISerializedFireControl;
    orders: ISerializedOrder[];
    characters: ISerializedCharacter[];
    health: number;
    maxHealth: number;
    cargo: ICargoItem[];
    burnTicks: number[];
    repairTicks: number[];
    healthTickCoolDown: number;
    moneyAccount: ISerializedMoneyAccount;
    voronoiIndices: number[];
    actionItems: ISerializedShipActionItem[];
}

export class ShipActionItem {
    public id: string;
    public actionType: EShipActionItemType;
    public direction: [number, number, number];

    public constructor(actionType: EShipActionItemType, direction: [number, number, number]) {
        this.id = `action-type-${Math.floor(Math.random() * 1000 * 1000)}`;
        this.actionType = actionType;
        this.direction = direction;
    }

    public serialize(): ISerializedShipActionItem {
        return {
            id: this.id,
            actionType: this.actionType,
            direction: this.direction,
        };
    }

    public deserializeUpdate(data: ISerializedShipActionItem) {
        this.id = data.id;
        this.actionType = data.actionType;
        this.direction = data.direction;
    }

    public static deserialize(data: ISerializedShipActionItem): ShipActionItem {
        const item = new ShipActionItem(data.actionType, data.direction);
        item.deserializeUpdate(data);
        return item;
    }
}

export class Ship implements IAutomatedShip {
    public app: Game;
    public id: string = "";
    public shipType: EShipType;
    public faction: Faction | null = null;
    public planet: Planet | null = null;
    public color: string = "purple";
    public position: Quaternion = Quaternion.ONE;
    public positionVelocity: Quaternion = Quaternion.ONE;
    public orientation: Quaternion = Quaternion.ONE;
    public orientationVelocity: Quaternion = Quaternion.ONE;
    public cannonLoading?: Date = undefined;
    public cannonCoolDown: number = 0;
    public cannonadeCoolDown: number[];
    public activeKeys: string[] = [];
    public buffs: IAutomatedShipBuff[] = [];
    public pathFinding: PathFinder<Ship> = new PathFinder<Ship>(this);
    public fireControl: FireControl<Ship>;
    public orders: Order[] = [];
    public characters: Character[] = [];
    public health: number = 1;
    public maxHealth: number = 1;
    public cargo: ICargoItem[] = [];
    public burnTicks: number[] = new Array(Game.NUM_BURN_TICKS).fill(0);
    public repairTicks: number[] = new Array(Game.NUM_REPAIR_TICKS).fill(0);
    public healthTickCoolDown = Game.HEALTH_TICK_COOL_DOWN;
    public moneyAccount: MoneyAccount = new MoneyAccount();
    public voronoiIndices: number[] = [] as number[];
    public boardScreens: Map<string, {isBoarding: boolean}> = new Map<string, {isBoarding: boolean}>();
    public actionItems: ShipActionItem[] = [];

    public serialize(): ISerializedShip {
        return {
            id: this.id,
            shipType: this.shipType,
            faction: this.faction ? this.faction.id : null,
            planetId: this.planet ? this.planet.id : null,
            color: this.color,
            position: SerializeQuaternion(this.position),
            positionVelocity: SerializeQuaternion(this.positionVelocity),
            orientation: SerializeQuaternion(this.orientation),
            orientationVelocity: SerializeQuaternion(this.orientationVelocity),
            cannonLoading: this.cannonLoading,
            cannonCoolDown: this.cannonCoolDown,
            cannonadeCoolDown: this.cannonadeCoolDown,
            activeKeys: this.activeKeys,
            pathFinding: this.pathFinding.serialize(),
            fireControl: this.fireControl.serialize(),
            orders: this.orders.map(o => o.serialize()),
            characters: this.characters.map(o => o.serialize()),
            health: this.health,
            maxHealth: this.maxHealth,
            cargo: this.cargo,
            burnTicks: this.burnTicks,
            repairTicks: this.repairTicks,
            healthTickCoolDown: this.healthTickCoolDown,
            moneyAccount: this.moneyAccount.serialize(),
            voronoiIndices: this.voronoiIndices,
            actionItems: this.actionItems.map(o => o.serialize()),
        };
    }

    public deserializeUpdate(data: ISerializedShip) {
        this.id = data.id;
        this.shipType = data.shipType;
        this.faction = data.faction && this.app.factions.get(data.faction) || null;
        this.planet = data.planetId && this.app.planets.get(data.planetId) || null;
        this.color = data.color;
        this.position = DeserializeQuaternion(data.position);
        this.positionVelocity = DeserializeQuaternion(data.positionVelocity);
        this.orientation = DeserializeQuaternion(data.orientation);
        this.orientationVelocity = DeserializeQuaternion(data.orientationVelocity);
        this.cannonLoading = data.cannonLoading;
        this.cannonCoolDown = data.cannonCoolDown;
        this.cannonadeCoolDown = data.cannonadeCoolDown;
        this.activeKeys = data.activeKeys;
        this.pathFinding.deserializeUpdate(data.pathFinding);
        this.fireControl.deserializeUpdate(data.fireControl);
        this.orders.splice(0, this.orders.length);
        this.orders.push.apply(this.orders, data.orders.map(d => Order.deserialize(this.app, this, d)));
        this.characters.splice(0, this.characters.length);
        this.characters.push.apply(this.characters, data.characters.map(d => Character.deserialize(this.app, d)));
        this.health = data.health;
        this.maxHealth = data.maxHealth;
        this.cargo = data.cargo;
        this.burnTicks = data.burnTicks;
        this.repairTicks = data.repairTicks;
        this.healthTickCoolDown = data.healthTickCoolDown;
        this.moneyAccount.deserializeUpdate(data.moneyAccount);
        this.voronoiIndices = data.voronoiIndices;
        this.actionItems.splice(0, this.actionItems.length);
        this.actionItems.push.apply(this.actionItems, data.actionItems.map(d => ShipActionItem.deserialize(d)));
    }

    public static deserialize(game: Game, data: ISerializedShip): Ship {
        const item = new Ship(game, data.shipType);
        item.deserializeUpdate(data);
        return item;
    }

    constructor(app: Game, shipType: EShipType) {
        this.app = app;
        this.fireControl = new FireControl<Ship>(this.app, this);
        this.shipType = shipType;

        const shipData = GetShipData(this.shipType, this.app.shipScale);
        if (!shipData) {
            throw new Error("Could not find ship type");
        }
        this.health = shipData.hullStrength;
        this.maxHealth = shipData.hullStrength;
        this.cannonadeCoolDown = new Array(shipData.cannons.numCannonades).fill(0);
    }

    public setShipCrew(characterSelection?: ICharacterSelectionItem[]) {
        const factionData = GameFactionData.find(x => x.id === this.faction.id);
        if (characterSelection) {
            // default ship crew
            this.characters = [];
            for (const item of characterSelection) {
                for (let i = 0; i < item.amount; i++) {
                    this.characters.push(new Character(this.app, item.faction, item.characterRace, item.characterClass));
                }
            }
        } else {
            // random ship crew
            this.characters = new Array(5).fill(0).map(() => {
                if (factionData) {
                    const characterClasses = factionData.races.reduce((acc, x) => [...acc, ...x.classes.map(y => [x.id, y])], [] as Array<[ERaceData, IClassData]>) as Array<[ERaceData, IClassData]>;
                    const characterClass = characterClasses[Math.floor(Math.random() * characterClasses.length)];
                    if (characterClass) {
                        return new Character(this.app, factionData.id, characterClass[0], characterClass[1].id);
                    }
                }
                return null;
            }).filter(x => !!x);
        }
    }

    getSpeedFactor(): number {
        const shipData = GetShipData(this.shipType, this.app.shipScale);
        if (!shipData) {
            throw new Error("Could not find ship type");
        }

        // health affects speed proportionally
        const healthSpeedFactor = this.health / this.maxHealth;
        // cargo slows the ship down to half speed, with full cargo.
        const cargoSpeedFactor = 0.6 + 0.4 * (1 - (this.cargo.length / shipData.cargoSize));

        // combine speed factors
        return healthSpeedFactor * cargoSpeedFactor;
    }

    public getVelocitySpeed = (): number => {
        const shipData = GetShipData(this.shipType, this.app.worldScale);
        return 1 / ((1 / Game.VELOCITY_DRAG) * shipData.acceleration);
    }

    public getVelocityAcceleration = (): number => {
        const shipData = GetShipData(this.shipType, this.app.worldScale);
        return 1 / ((1 / Game.VELOCITY_STEP) * shipData.topSpeed);
    }

    public getRotation = (): number => {
        const shipData = GetShipData(this.shipType, this.app.worldScale);
        return 1 / ((1 / Game.ROTATION_STEP) * shipData.rotation);
    }

    public hasDisabledMovement = (): boolean => {
        const disabledBuff = this.buffs.find(b => b.buffType === EAutomatedShipBuffType.DISABLED);
        if (disabledBuff) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Determine if the ship is in the mission area.
     */
    isInMissionArea(): boolean {
        const order = this.orders[0];
        if (order) {
            // has an order, check first order mission area
            return order.isInMissionArea();
        } else {
            // no orders, is in mission area
            return true;
        }
    }

    /**
     * Determine if the ship has piracy orders.
     */
    hasPirateOrder(): boolean {
        return this.orders.some(o => o.orderType === EOrderType.PIRATE);
    }

    nearPirateCrate(): Crate | null {
        const crate = Array.from(this.app.crates.values()).find(c => {
            const cratePosition = c.position.clone().rotateVector([0, 0, 1]);
            const shipPosition = this.position.clone().rotateVector([0, 0, 1]);
            const distance = VoronoiGraph.angularDistance(cratePosition, shipPosition, this.app.worldScale);
            return distance < Game.PROJECTILE_DETECTION_RANGE * 1.4;
        });
        if (crate) {
            return crate;
        } else {
            return null;
        }
    }

    /**
     * Determine if the ship has pirate cargo.
     */
    hasPirateCargo(): boolean {
        return this.cargo.some(c => c.pirated);
    }

    /**
     * Apply a spell to the ship.
     * @param spellBall
     */
    public applySpellBallDamage(spellBall: SpellBall) {
        if (spellBall.shipBuffs?.length > 0) {
            for (const buff of spellBall.shipBuffs) {
                this.buffs.push(buff);
            }
        }
        this.applyDamage(spellBall);
    }

    /**
     * Apply damage to the ship. Damage will slow down the ship and enough damage will destroy it.
     * @param cannonBall
     */
    public applyDamage(cannonBall: CannonBall) {
        // compute damage properties
        let physicalDamage = cannonBall.damage * (1 - Game.BURN_DAMAGE_RATIO);
        let burnDamage = cannonBall.damage * Game.BURN_DAMAGE_RATIO;
        let repairDamage = cannonBall.damage * Game.REPAIR_DAMAGE_RATIO;

        // apply iron wood modifier
        const hasIronWood = this.buffs.some(x => x.buffType === EAutomatedShipBuffType.IRONWOOD);
        if (hasIronWood) {
            physicalDamage *= 0.5;
            burnDamage *= 0.5;
            repairDamage *= 0.5;
        }

        // apply instant physical damage
        this.health = Math.max(0, this.health - physicalDamage);

        // queue burn damage
        const burnTickDamage = burnDamage / this.burnTicks.length;
        for (let i = 0; i < this.burnTicks.length; i++) {
            this.burnTicks[i] += burnTickDamage;
        }

        // queue repair damage
        const repairTickDamage = repairDamage / this.repairTicks.length;
        for (let i = 0; i < this.repairTicks.length; i++) {
            this.repairTicks[i] += repairTickDamage;
        }

        // score damage
        const playerData = Array.from(this.app.playerData.values()).find(p => p.shipId === cannonBall.shipId);
        if (playerData) {
            if ([EServerType.STANDALONE].includes(this.app.serverType)) {
                // global scoreboard
                {
                    const item = this.app.scoreBoard.damage.find(i => i.playerId === playerData.id);
                    if (item) {
                        item.damage += cannonBall.damage;
                    } else {
                        this.app.scoreBoard.damage.push({
                            playerId: playerData.id,
                            name: playerData.name,
                            damage: cannonBall.damage
                        });
                    }
                    this.app.scoreBoard.damage.sort((a, b) => b.damage - a.damage);
                }

                const nearestPlanet = this.app.voronoiTerrain.getNearestPlanet(this.position.rotateVector([0, 0, 1]));
                if (nearestPlanet) {
                    const invasion = this.app.invasions.get(nearestPlanet.id);
                    if (invasion) {
                        if (invasion.attacking === this.faction) {
                            const invasionItem = invasion.attackerScores.find(i => i.playerId === playerData.id);
                            if (invasionItem) {
                                invasionItem.damage += cannonBall.damage;
                            } else {
                                invasion.attackerScores.push({
                                    playerId: playerData.id,
                                    name: playerData.name,
                                    capture: 0,
                                    damage: cannonBall.damage
                                });
                            }
                            invasion.attackerScores.sort((a, b) => {
                                const captureDiff = b.capture - a.capture;
                                if (captureDiff) {
                                    return captureDiff;
                                }
                                return b.damage - a.damage;
                            });
                        }
                        if (invasion.defending === this.faction) {
                            const invasionItem = invasion.defenderScores.find(i => i.playerId === playerData.id);
                            if (invasionItem) {
                                invasionItem.damage += cannonBall.damage;
                            } else {
                                invasion.defenderScores.push({
                                    playerId: playerData.id,
                                    name: playerData.name,
                                    damage: cannonBall.damage
                                });
                            }
                            invasion.defenderScores.sort((a, b) => {
                                return b.damage - a.damage;
                            });
                        }
                    }
                }

                this.app.soundEvents.push({
                    shipId: this.id,
                    soundType: ESoundType.HIT,
                    soundEventType: ESoundEventType.ONE_OFF
                });

                // faction bounty list
                if (this.faction) {
                    const extraPointsForDestroyingShip = this.health <= 0 ? GetShipData(this.shipType, 1).cost : 0;

                    // increase bounty on target ship
                    {
                        const item = this.faction.bounties.find(i => i.playerId === playerData.id);
                        if (item) {
                            item.bounty += cannonBall.damage + extraPointsForDestroyingShip;
                        } else {
                            this.faction.bounties.push({
                                playerId: playerData.id,
                                name: playerData.name,
                                bounty: cannonBall.damage + extraPointsForDestroyingShip,
                            });
                        }
                        this.faction.bounties.sort((a, b) => b.bounty - a.bounty);
                    }

                    // apply bounty score
                    const playerFaction = this.app.factions.get(playerData.factionId);
                    const targetPlayerId = Array.from(this.app.playerData.values()).find(p => p.shipId === this.id)?.id;
                    const playerFactionBounty = targetPlayerId && playerFaction?.bounties.find(b => b.playerId === targetPlayerId);
                    if (playerFaction && extraPointsForDestroyingShip && playerFactionBounty) {
                        const item = this.app.scoreBoard.bounty.find(i => i.playerId === playerData.id);
                        if (item) {
                            item.bountyAmount += playerFactionBounty.bounty;
                        } else {
                            this.app.scoreBoard.bounty.push({
                                playerId: playerData.id,
                                name: playerData.name,
                                bountyAmount: playerFactionBounty.bounty
                            });
                        }
                        this.app.scoreBoard.bounty.sort((a, b) => b.bountyAmount - a.bountyAmount);
                        PlanetaryMoneyAccount.PayBonusFromBalance(playerData.moneyAccount, this.planet.moneyAccount, [{currencyId: "GOLD", amount: playerFactionBounty.bounty}], 1 / 10);
                    }
                }
            } else if ([EServerType.PHYSICS_NODE].includes(this.app.serverType)) {
                const globalScoreBoardMessage: IDamageScoreShardMessage = {
                    shardMessageType: EShardMessageType.DAMAGE_SCORE,
                    playerId: playerData.id,
                    name: playerData.name,
                    damage: cannonBall.damage
                };
                const globalShard = Array.from(this.app.shardList.values()).find(s => s.type === EServerType.GLOBAL_STATE_NODE);
                this.app.outgoingShardMessages.push([globalShard.name, globalScoreBoardMessage]);
            }
        }
    }

    /**
     * Handle the health tick of the ship.
     * @param delta The amount to reduce tick
     */
    public handleHealthTick(delta: number = 1) {
        if (this.healthTickCoolDown <= 0) {
            // apply health tick
            this.healthTickCoolDown = Game.HEALTH_TICK_COOL_DOWN;

            const shouldApplyBurnDamage = this.burnTicks.some(n => n > 0);
            if (shouldApplyBurnDamage) {
                // ship is burning, do not repair, only burn
                this.health = Math.max(0, this.health - this.burnTicks[0]);
                this.burnTicks.shift();
                this.burnTicks.push(0);
            } else {
                // ship is not burning, begin repairs
                this.health = Math.min(this.maxHealth, this.health + this.repairTicks[0]);
                this.repairTicks.shift();
                this.repairTicks.push(0);
            }
        } else {
            // wait to apply health tick
            this.healthTickCoolDown -= delta;
        }
    }

    public handleBuffTick(delta: number = 1) {
        for (const buff of this.buffs) {
            buff.expireTicks -= delta;
        }
        this.buffs = this.buffs.filter(b => b.expireTicks > 0);
    }

    public handleBoardingScreen() {
        // handle player forms
        const handleBoardScreen = (playerId: string, ship: Ship) => {
            if (!playerId) {
                return;
            }

            const canBoard = ship.faction !== this.faction /*&& VoronoiGraph.angularDistanceQuaternion(ship.positionVelocity.clone(), this.app.worldScale) < Game.VELOCITY_STEP * 10*/;
            const hasBoardScreen = this.boardScreens.has(playerId);
            if (canBoard && !hasBoardScreen) {
                this.boardScreens.set(playerId, {isBoarding: false});
                this.app.addFormEmitter(playerId, {type: EFormEmitterType.SHIP, id: this.id});
            }
            if (!canBoard && hasBoardScreen) {
                this.boardScreens.delete(playerId);
                this.app.removeFormEmitter(playerId, {type: EFormEmitterType.SHIP, id: this.id});
            }
        };

        // get a list of nearby ships
        const shipPosition = this.position.clone().rotateVector([0, 0, 1]);
        const nearByShips = Array.from(this.app.voronoiShips.listItems(shipPosition));
        const nearByEnemyShips: Ship[] = [];
        for (const nearByShip of nearByShips) {
            const distance = VoronoiGraph.angularDistance(
                nearByShip.position.clone().rotateVector([0, 0, 1]),
                shipPosition,
                this.app.worldScale
            );
            if (distance < nearByShip.getVelocityAcceleration() * this.app.worldScale * Math.PI / 2 * 100) {
                if (!(nearByShip.faction && this.faction && nearByShip.faction.id === this.faction.id)) {
                    nearByEnemyShips.push(nearByShip);
                }
            }
        }
        for (const ship of nearByEnemyShips) {
            const playerId = Array.from(this.app.playerData.values()).find(x => x.shipId === ship.id)?.id;
            handleBoardScreen(playerId, ship);
        }
        for (const playerId of Array.from(this.boardScreens.keys())) {
            const playerData = this.app.playerData.get(playerId);
            if (playerData) {
                const ship = this.app.ships.get(playerData.shipId);
                if (ship) {
                    handleBoardScreen(playerId, ship);
                }
            }
        }
    }

    public getBoardScreenForPlayer(playerId: string): IFormCard[] {
        const boardScreen = this.boardScreens.get(playerId);
        if (boardScreen && !boardScreen.isBoarding) {
            return [{
                title: "Ship of " + this.id,
                fields: [[{
                    label: "Begin Boarding",
                    dataField: undefined,
                    type: EFormFieldType.BUTTON,
                    isReadOnly: false,
                    buttonPath: EShipFormActions.BEGIN_BOARDING
                }]],
                data: {}
            }];
        }
        return [];
    }

    public handleBoardScreenRequestsForPlayer(playerId: string, request: IFormRequest) {
        switch (request.buttonPath as EShipFormActions) {
            case EShipFormActions.BEGIN_BOARDING: {
                const playerTradeScreen = this.boardScreens.get(playerId);
                if (playerTradeScreen) {
                    const attackerData = this.app.playerData.get(playerId);
                    if (attackerData) {
                        const attackerShip = this.app.ships.get(attackerData.shipId);
                        if (attackerShip) {
                            playerTradeScreen.isBoarding = true;

                            const ships: Ship[] = [
                                attackerShip,
                                this
                            ];
                            const characterBattle = new CharacterBattle(this.app, ships);
                            this.app.characterBattles.set(characterBattle.id, characterBattle);
                            ships.forEach(x => {
                                x.positionVelocity = Quaternion.ONE;
                                const disabledBuff: IAutomatedShipBuff = {
                                    buffType: EAutomatedShipBuffType.DISABLED,
                                    expireTicks: 30 * 100
                                };
                                x.buffs.push(disabledBuff);
                            });
                        }
                    }
                }
                break;
            }
        }
    }

    /**
     * Remove an order from the ship.
     * @param order The order to remove.
     */
    public removeOrder(order: Order) {
        // clean faction data
        if (this.planet && order.planetId) {
            const planetData = this.planet.explorationGraph[order.planetId];

            // clean up invade order
            if (planetData && order.orderType === EOrderType.INVADE) {
                const index = planetData.invaderShipIds.findIndex(s => s === this.id);
                if (index >= 0) {
                    this.planet.explorationGraph[order.planetId].invaderShipIds.splice(index, 1);
                }
            }

            // clean up settle order
            if (planetData && order.orderType === EOrderType.SETTLE) {
                const index = planetData.settlerShipIds.findIndex(s => s === this.id);
                if (index >= 0) {
                    this.planet.explorationGraph[order.planetId].settlerShipIds.splice(index, 1);
                }
            }

            // clean up trade order
            if (planetData && order.orderType === EOrderType.FEUDAL_TRADE || order.orderType === EOrderType.FAIR_TRADE) {
                const index = planetData.traderShipIds.findIndex(s => s === this.id);
                if (index >= 0) {
                    this.planet.explorationGraph[order.planetId].traderShipIds.splice(index, 1);
                }
            }

            // clean up pirate order
            if (planetData && order.orderType === EOrderType.PIRATE) {
                const index = planetData.pirateShipIds.findIndex(s => s === this.id);
                if (index >= 0) {
                    this.planet.explorationGraph[order.planetId].pirateShipIds.splice(index, 1);
                }
                const pirateSlotIndex = this.planet.pirateSlots.findIndex(s => s === order.owner.id);
                if (pirateSlotIndex >= 0) {
                    this.planet.pirateSlots.splice(pirateSlotIndex, 1);
                }
            }

            // handle retreated orders by not sending another ship towards that area for a while
            if (planetData && order.orderResult === EOrderResult.RETREAT) {
                planetData.enemyStrength = order.enemyStrength;
            }
        }

        // clean ship data
        const index2 = this.orders.findIndex(o => o === order);
        if (index2 >= 0) {
            this.orders.splice(index2, 1);
        }
    }

    /**
     * Add cargo to a ship.
     * @param crate
     */
    public pickUpCargo(crate: ICargoItem) {
        const shipData = GetShipData(this.shipType, this.app.shipScale);
        if (!shipData) {
            throw new Error("Could not find ship type");
        }
        if (this.cargo.length < shipData.cargoSize) {
            const cargoItem: ICargoItem = {
                resourceType: crate.resourceType,
                sourcePlanetId: crate.sourcePlanetId,
                amount: crate.amount,
                pirated: true
            };
            this.cargo.push(cargoItem);
        }
    }

    /**
     * Destroy the ship and create crates.
     */
    public destroy(): Crate[] {
        const crates: Crate[] = [];
        for (const cargo of this.cargo) {
            const randomDirection = Quaternion.fromAxisAngle([0, 0, 1], Math.random() * 2 * Math.PI - Math.PI)
                .rotateVector([1, 0, 0]);
            const randomVelocity = Quaternion.fromBetweenVectors([0, 0, 1], randomDirection).pow(this.getVelocitySpeed() / this.app.worldScale * 0.1);

            const crate = new Crate(cargo.resourceType, cargo.sourcePlanetId, cargo.amount);
            crate.id = `${this.id}-crate-${Math.floor(Math.random() * 100000)}`;
            crate.position = this.position;
            crate.positionVelocity = this.positionVelocity.clone().pow(1 / 50).mul(randomVelocity);
            crate.positionVelocity = Quaternion.ONE;
            crate.orientation = Quaternion.fromAxisAngle([0, 0, 1], Math.random() * 2 * Math.PI - Math.PI);
            crate.orientationVelocity = Quaternion.fromAxisAngle([0, 0, 1], Math.random() > 0 ? this.getRotation() : -this.getRotation());
            crate.maxLife = 2 * 60 * 10;
            crate.size = 100;
            crates.push(crate);
        }

        // register a destroyed ship with the faction
        // incorrect behavior, the faction should think the ship is destroyed after a timeout
        if (this.planet) {
            this.planet.handleShipDestroyed(this, true);
        }
        if (this.faction) {
            this.faction.handleShipDestroyed(this, true);
        }
        return crates;
    }

    /**
     * Buy a good from the ship.
     * @param resourceType The resource to buy
     */
    public buyGoodFromShip(resourceType: EResourceType): ICargoItem | null {
        const index = this.cargo.findIndex(c => c.resourceType === resourceType);
        if (index >= 0) {
            return this.cargo.splice(index, 1)[0];
        } else {
            return null;
        }
    }

    /**
     * Sell a good to the ship.
     * @param resourceExported The resource exported from the planet.
     * @param sourcePlanetId The source of the resource.
     */
    public sellGoodToShip(resourceExported: IResourceExported, sourcePlanetId: string): boolean {
        const shipData = GetShipData(this.shipType, this.app.shipScale);
        if (!shipData) {
            throw new Error("Could not find ship type");
        }
        if (this.cargo.length < shipData.cargoSize) {
            const {
                resourceType,
                amount,
            } = resourceExported;
            this.cargo.push({
                resourceType,
                amount,
                sourcePlanetId,
                pirated: false,
            });
            return true;
        } else {
            return false;
        }
    }
}

export interface ISerializedFireControl {
    targetShipId: string | null;
    coolDown: number;
    retargetCoolDown: number;
    isAttacking: boolean;
    lastStepShouldRotate: boolean;
}

/**
 * Allows the AI ship to fire at other ships in the world.
 */
export class FireControl<T extends IAutomatedShip> {
    public app: Game;
    public owner: T;
    public targetShipId: string | null = null;
    public coolDown: number = 0;
    public retargetCoolDown: number = 0;
    public isAttacking: boolean = false;
    public lastStepShouldRotate: boolean = false;

    public serialize(): ISerializedFireControl {
        return {
            targetShipId: this.targetShipId,
            coolDown: this.coolDown,
            retargetCoolDown: this.retargetCoolDown,
            isAttacking: this.isAttacking,
            lastStepShouldRotate: this.lastStepShouldRotate
        };
    }

    public deserializeUpdate(data: ISerializedFireControl) {
        this.targetShipId = data.targetShipId;
        this.coolDown = data.coolDown;
        this.retargetCoolDown = data.retargetCoolDown;
        this.isAttacking = data.isAttacking;
        this.lastStepShouldRotate = data.lastStepShouldRotate;
    }

    public static deserialize<T extends IAutomatedShip>(app: Game, instance: T, data: ISerializedFireControl): FireControl<T> {
        const item = new FireControl<T>(app, instance);
        item.deserializeUpdate(data);
        return item;
    }

    constructor(app: Game, owner: T) {
        this.app = app;
        this.owner = owner;
    }

    /**
     * Get a cone hit solution towards target ship. This is where to aim to hit a moving ship.
     * @param target
     */
    public getConeHit(target: Ship): IConeHitTest {
        const shipPositionPoint = this.owner.orientation.clone().inverse()
            .mul(this.owner.position.clone().inverse())
            .mul(target.position.clone())
            .rotateVector([0, 0, 1]);
        const shipPosition: [number, number] = [
            (shipPositionPoint[0] / this.app.worldScale),
            (shipPositionPoint[1] / this.app.worldScale)
        ];
        const shipDirectionPoint = this.owner.orientation.clone().inverse()
            .mul(this.owner.position.clone().inverse())
            .mul(this.owner.positionVelocity.clone().inverse().pow(this.owner.getSpeedFactor()))
            .mul(target.position.clone())
            .mul(target.positionVelocity.clone().pow(target.getSpeedFactor()))
            .rotateVector([0, 0, 1]);
        const shipDirection: [number, number] = [
            (shipDirectionPoint[0] / this.app.worldScale) - shipPosition[0],
            (shipDirectionPoint[1] / this.app.worldScale) - shipPosition[1]
        ];
        const projectileSpeed = Game.PROJECTILE_SPEED / this.app.worldScale;
        return computeConeLineIntersection(shipPosition, shipDirection, projectileSpeed);
    }

    /**
     * Get an intercept cone hit solution towards target ship. This is where to go, to be close to a moving ship.
     * @param target
     */
    public getInterceptConeHit(target: ICameraState): [number, number, number] | null {
        const shipPositionPoint = this.owner.orientation.clone().inverse()
            .mul(this.owner.position.clone().inverse())
            .mul(target.position.clone())
            .rotateVector([0, 0, 1]);
        const shipPosition: [number, number] = [
            shipPositionPoint[0],
            shipPositionPoint[1]
        ];
        const shipDirectionPoint = this.owner.orientation.clone().inverse()
            .mul(this.owner.position.clone().inverse())
            .mul(this.owner.positionVelocity.clone().inverse().pow(this.owner.getSpeedFactor()))
            .mul(target.position.clone())
            .mul(target.positionVelocity.clone().pow(target.getSpeedFactor ? target.getSpeedFactor() : 1))
            .rotateVector([0, 0, 1]);
        const shipDirection: [number, number] = [
            shipDirectionPoint[0] - shipPosition[0],
            shipDirectionPoint[1] - shipPosition[1]
        ];
        const attackingShipSpeed = this.owner.getVelocityAcceleration() / this.owner.getVelocitySpeed() * this.owner.getSpeedFactor();
        const interceptConeHit = computeConeLineIntersection(shipPosition, shipDirection, attackingShipSpeed, 0);

        // handle cone hit result
        if (interceptConeHit.success && interceptConeHit.point && interceptConeHit.time && interceptConeHit.time < 60 * 10) {
            // convert cone hit into world reference frame
            const localReferenceFrame: [number, number, number] = [
                interceptConeHit.point[0],
                interceptConeHit.point[1],
                Math.sqrt(1 - Math.pow(interceptConeHit.point[0], 2) - Math.pow(interceptConeHit.point[1], 2))
            ];
            return this.owner.orientation.clone()
                .mul(this.owner.position.clone())
                .rotateVector(localReferenceFrame);
        } else {
            return null;
        }
    }

    /**
     * Compute unit vector towards target ship.
     */
    public getTargetVector(): [number, number, number] | null {
        const target = this.app.ships.get(this.targetShipId);
        if (!target) {
            return null;
        }
        const coneHit = this.getConeHit(target);
        if (!(coneHit.success && coneHit.point && coneHit.time && coneHit.time < Game.PROJECTILE_LIFE * 0.5)) {
            // target is moving too fast, cannot hit it
            this.targetShipId = null;
            this.retargetCoolDown = 10;
            return null;
        }
        return DelaunayGraph.normalize([
            coneHit.point[0],
            coneHit.point[1],
            0
        ]);
    }

    public integrateOrientationSpeedFrames(orientationSpeed: number): number {
        const n = Math.floor(orientationSpeed / this.owner.getRotation() / 2);
        return Math.max(5, (n * (n - 1)) / 2 * 0.8);
    }

    /**
     * Handle the fire control of the ship. Will aim at ships, ect...
     */
    public fireControlLoop() {
        // retarget another ship occasionally
        if (this.retargetCoolDown > 0) {
            this.retargetCoolDown -= 1;
        } else {
            this.retargetCoolDown = 10;
        }

        const nearestPlanet = this.app.voronoiTerrain.getNearestPlanet(this.owner.position.rotateVector([0, 0, 1]));
        const isNearClaim = nearestPlanet.county.faction?.shipIds.includes(this.owner.id) ?? false;

        const target = this.app.ships.get(this.targetShipId);
        if (!target) {
            // no targets, cancel attack
            this.targetShipId = null;
            this.retargetCoolDown = 10;
            this.owner.activeKeys.splice(0, this.owner.activeKeys.length);
            this.isAttacking = false;
            return;
        }

        const isInMissionArea = this.owner.isInMissionArea();
        if (!isInMissionArea && !isNearClaim) {
            // outside of mission area, cancel attack to return to mission area
            this.owner.activeKeys.splice(0, this.owner.activeKeys.length);
            this.isAttacking = false;
            return;
        }

        const hasPirateOrder = this.owner.hasPirateOrder();
        const nearByPirateCrate = this.owner.nearPirateCrate();
        const hasPirateCargo = this.owner.hasPirateCargo();
        if (hasPirateOrder && hasPirateCargo) {
            // has pirate cargo, return to home base, cancel attack
            this.owner.activeKeys.splice(0, this.owner.activeKeys.length);
            this.isAttacking = false;
            return;
        }
        if (nearByPirateCrate && hasPirateOrder && this.owner.pathFinding) {
            // nearby pirate cargo, get the cargo.
            const targetPosition = nearByPirateCrate.position.rotateVector([0, 0, 1]);
            this.owner.pathFinding.points = [
                targetPosition
            ];
            this.isAttacking = false;
            return;
        }

        // there are targets, begin attack
        //
        // compute moving projectile path to hit target
        const coneHit = this.getConeHit(target);
        let detectionConeSizeInTicks = Game.PROJECTILE_LIFE;
        // if (this.owner.hasPirateOrder()) {
        //     // pirates get close to attack
        //     if (this.isAttacking) {
        //         detectionConeSizeInTicks *= 0.8;
        //     } else {
        //         detectionConeSizeInTicks *= 0.4;
        //     }
        // }
        if (!(coneHit.success && coneHit.point && coneHit.time && coneHit.time < detectionConeSizeInTicks)) {
            // target is moving too fast, cannot hit it
            this.isAttacking = false;

            // move closer to target to attack it
            if (this.owner.pathFinding) {
                // get target position to attack enemy ship
                const targetPosition = target.position.rotateVector([0, 0, 1]);

                // update target position if it exists
                if (this.owner.pathFinding.points.length > 1) {
                    this.owner.pathFinding.points.shift();
                    this.owner.pathFinding.points.unshift(targetPosition);
                } else if (this.owner.pathFinding.points.length === 1) {
                    this.owner.pathFinding.points.unshift(targetPosition);
                } else {
                    this.owner.pathFinding.points.push(targetPosition);
                }
            }
            return;
        }

        // all cancel attack parameters are false, begin attack
        this.isAttacking = true;

        // compute rotation towards target
        let targetOrientationPoint: [number, number, number] = [
            coneHit.point[0],
            coneHit.point[1],
            0
        ];
        targetOrientationPoint = DelaunayGraph.normalize(targetOrientationPoint);
        let orientationDiffAngle = targetOrientationPoint[0] >= 0 ?
            Math.atan2(-targetOrientationPoint[1], -targetOrientationPoint[0]) :
            Math.atan2(targetOrientationPoint[1], targetOrientationPoint[0]);
        orientationDiffAngle = (orientationDiffAngle - Math.PI / 2) % (Math.PI * 2);
        const orientationSpeed = VoronoiGraph.angularDistanceQuaternion(this.owner.orientationVelocity, 1) * (orientationDiffAngle > 0 ? 1 : -1);
        const desiredOrientationSpeed = Math.max(-this.owner.getRotation() * 10, Math.min(Math.round(
            -(360 / 4) / Math.PI * orientationDiffAngle
        ), this.owner.getRotation() * 10));

        // perform rotation and speed up
        // use a class variable to force more tight angle correction, and a more relaxed angle check while moving
        // should result in stop and go less often.
        const shouldRotate = this.lastStepShouldRotate ?
            Math.abs(orientationDiffAngle) > 2 / 180 * Math.PI || Math.abs(desiredOrientationSpeed) >= this.owner.getRotation() :
            Math.abs(orientationDiffAngle) > 5 / 180 * Math.PI || Math.abs(desiredOrientationSpeed) >= this.owner.getRotation();
        this.lastStepShouldRotate = shouldRotate;
        const willReachTargetRotation = Math.abs(orientationDiffAngle) / Math.abs(orientationSpeed) < this.integrateOrientationSpeedFrames(orientationSpeed);
        if (shouldRotate && desiredOrientationSpeed > orientationSpeed && !willReachTargetRotation && !this.owner.activeKeys.includes("a")) {
            // press a to rotate left
            this.owner.activeKeys.push("a");
        } else if (shouldRotate && desiredOrientationSpeed < orientationSpeed && !willReachTargetRotation && !this.owner.activeKeys.includes("d")) {
            // press d to rotate right
            this.owner.activeKeys.push("d");
        } else if (shouldRotate && desiredOrientationSpeed > orientationSpeed && willReachTargetRotation && !this.owner.activeKeys.includes("d")) {
            const aIndex = this.owner.activeKeys.findIndex((key) => key === "a");
            if (aIndex >= 0) {
                this.owner.activeKeys.splice(aIndex, 1);
            }

            // press d to rotate right to slow down
            this.owner.activeKeys.push("d");
        } else if (shouldRotate && desiredOrientationSpeed < orientationSpeed && willReachTargetRotation && !this.owner.activeKeys.includes("a")) {
            const dIndex = this.owner.activeKeys.findIndex((key) => key === "d");
            if (dIndex >= 0) {
                this.owner.activeKeys.splice(dIndex, 1);
            }

            // press a to rotate left to slow down
            this.owner.activeKeys.push("a");
        } else if (!shouldRotate && orientationSpeed > 0 && willReachTargetRotation && !this.owner.activeKeys.includes("a")) {
            const dIndex = this.owner.activeKeys.findIndex((key) => key === "d");
            if (dIndex >= 0) {
                this.owner.activeKeys.splice(dIndex, 1);
            }

            // press a to rotate left to slow down
            this.owner.activeKeys.push("a");
        } else if (!shouldRotate && orientationSpeed < 0 && willReachTargetRotation && !this.owner.activeKeys.includes("d")) {
            const aIndex = this.owner.activeKeys.findIndex((key) => key === "a");
            if (aIndex >= 0) {
                this.owner.activeKeys.splice(aIndex, 1);
            }

            // press d to rotate right to slow down
            this.owner.activeKeys.push("d");
        } else {
            // remove a d keys
            const aIndex = this.owner.activeKeys.findIndex((key) => key === "a");
            if (aIndex >= 0) {
                this.owner.activeKeys.splice(aIndex, 1);
            }
            const dIndex = this.owner.activeKeys.findIndex((key) => key === "d");
            if (dIndex >= 0) {
                this.owner.activeKeys.splice(dIndex, 1);
            }

            if (!this.owner.activeKeys.includes(" ") && this.coolDown <= 0) {
                // press space bar to begin firing
                this.owner.activeKeys.push(" ");
            } else if (this.owner.activeKeys.includes(" ") && this.coolDown <= 0) {
                // release space bar to fire cannons
                const spaceIndex = this.owner.activeKeys.findIndex((key) => key === " ");
                if (spaceIndex >= 0) {
                    this.owner.activeKeys.splice(spaceIndex, 1);
                }

                this.coolDown = 20;
            } else if (this.coolDown > 0) {
                // wait to cool down cannons
                this.coolDown -= 1;
            }
        }
    }
}