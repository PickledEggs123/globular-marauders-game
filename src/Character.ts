import {GameFactionData, EFaction, ERaceData, EClassData, IClassData} from "./EFaction";
import {Ship} from "./Ship";
import {Game} from "./Game";

export enum EHitType {
    MELEE = "MELEE",
    RANGE = "RANGE",
}

export enum EDamageType {
    MAGIC = "MAGIC",
    NORMAL = "NORMAL",
    STEALTH = "STEALTH",
    RANGE = "RANGE",
}

/**
 * A class to simulate a DnD Pokemon battle between two ships.
 */
export class CharacterBattle {
    public id: string;
    /**
     * The ships in the battle.
     */
    public ships: Ship[];

    /**
     * Get another enemy character to attack in a battle.
     * @param c
     */
    public getEnemyCharacter(c: Character): Character | null {
        const currentShip = this.ships.find(x => x.characters.some(c1 => c1 === c));
        if (currentShip) {
            const otherShips = this.ships.filter(x => x.faction !== currentShip.faction);
            const otherShip = otherShips[Math.floor(Math.random() * otherShips.length)];
            if (otherShip) {
                return otherShip.characters[Math.floor(Math.random() * otherShip.characters.length)] ?? null;
            }
        }
        return null;
    }

    /**
     * Each character takes turn attacking.
     */
    public takeTurn(): void {
        // do hit and damage
        this.ships.forEach(s => {
            s.characters.forEach(c => c.takeTurn());
        });
    }

    /**
     * Determine if the battle is over because the crew of one ship is knocked out.
     */
    public isDone(): boolean {
        // check win condition
        return this.ships.some(s => s.characters.every(c => c.hp <= 0));
    }

    /**
     * Setup the characters for DnD battle.
     */
    public setupForBattle(): void {
        this.ships.forEach(s => {
            s.characters.forEach(c => c.setupForBattle());
        })
    }

    /**
     * Iterator function which runs the battle once.
     * @private
     */
    private *performBattle(): IterableIterator<void> {
        yield;
        for (let i = 0; i < 100; i++) {
            this.takeTurn();
            if (this.isDone()) {
                return;
            }
            yield;
        }
    }

    /**
     * Instance of the iterator function.
     * @private
     */
    private battleIterator: IterableIterator<void> | null = null;

    /**
     * Run a battle until it's over turn by turn.
     */
    public runBattle(): boolean {
        if (!this.battleIterator) {
            this.battleIterator = this.performBattle();
            this.setupForBattle();
        }

        const result = this.battleIterator.next();
        if (result.done) {
            this.battleIterator = null;
            return true;
        } else {
            return false;
        }
    }
}

export interface ISerializedCharacter {
    id: string;
    factionId: EFaction;
    characterRace: ERaceData;
    characterClass: EClassData;
    hp: number;
    meleeDistance: number;
    underMelee: boolean;
    isHidden: boolean;
    targetCharacterId: string | null;
    battleId: string | null;
}

export class Character {
    /**
     * Unique identifier for the character.
     */
    public id: string;
    /**
     * Faction of the character.
     */
    public faction: EFaction;
    /**
     * Race of the character.
     */
    public characterRace: ERaceData;
    /**
     * Class of the character.
     */
    public characterClass: EClassData;
    /**
     * The number of health points a character has.
     */
    public hp: number = 18;
    /**
     * The number of turns before melee can begin. This means rangers and mages can attack for a few turns for free.
     */
    public meleeDistance: number = 3;
    /**
     * The character is under melee attack, cannot range attack.
     */
    public underMelee: boolean = false;
    /**
     * The character is stealthy and hidden. Extra damage.
     */
    public isHidden: boolean = false;
    /**
     * Reference to the game.
     */
    public game: Game;
    /**
     * The currently targeted character.
     */
    public targetCharacter: Character | null = null;
    /**
     * The battle class which connects to a character for the character to perform DnD battle.
     */
    public battle: CharacterBattle | null = null;

    public constructor(game: Game, faction: EFaction, characterRace: ERaceData, characterClass: EClassData) {
        this.id = `character-${Math.floor(1000 * 1000 * Math.random())}`;
        this.game = game;
        this.faction = faction;
        this.characterRace = characterRace;
        this.characterClass = characterClass;
    }

    public serialize(): ISerializedCharacter {
        return {
            id: this.id,
            factionId: this.faction,
            characterRace: this.characterRace,
            characterClass: this.characterClass,
            hp: this.hp,
            meleeDistance: this.meleeDistance,
            underMelee: this.underMelee,
            isHidden: this.isHidden,
            targetCharacterId: this.targetCharacter?.id ?? null,
            battleId: this.battle?.id ?? null,
        };
    }

    public deserializeUpdate(data: ISerializedCharacter) {
        this.faction = data.factionId;
        this.characterRace = data.characterRace;
        this.characterClass = data.characterClass;
        this.hp = data.hp;
        this.meleeDistance = data.meleeDistance;
        this.underMelee = data.underMelee;
        this.isHidden = data.isHidden;

        const characterBattle: CharacterBattle = this.game.characterBattles.get(data.battleId);
        if (characterBattle) {
            this.battle = characterBattle;
        } else {
            this.battle = null;
        }

        if (characterBattle) {
            const targetCharacter = characterBattle.ships.reduce((acc, x) => [...acc, ...x.characters], [] as Character[]).find(x => x.id === data.targetCharacterId);
            if (targetCharacter) {
                this.targetCharacter = targetCharacter;
            } else {
                this.targetCharacter = null;
            }
        } else {
            this.targetCharacter = null;
        }
    }

    public static deserialize(game: Game, data: ISerializedCharacter): Character {
        const item = new Character(game, data.factionId, data.characterRace, data.characterClass);
        item.deserializeUpdate(data);
        return item;
    }

    /**
     * Setup for battle.
     */
    public setupForBattle(): void {
        this.hp = 18;
        this.meleeDistance = 3;
        this.underMelee = false;
        this.isHidden = true;
    }

    /**
     * Get character hit type, melee or range.
     */
    public getCharacterHitType(): EHitType {
        const classData = this.getClassData();
        if (classData) {
            if (classData.isRange && !this.underMelee) {
                return EHitType.RANGE;
            }
        }
        return EHitType.MELEE;
    }

    /**
     * Get character damage type, Magic, Normal, or Stealth.
     */
    public getCharacterDamageType(): EDamageType {
        const classData = this.getClassData();
        if (classData) {
            if (classData.isMagic && !this.underMelee) {
                return EDamageType.MAGIC;
            }
            if (classData.isRange) {
                return EDamageType.RANGE;
            }
            if (classData.isStealth) {
                return EDamageType.STEALTH;
            }
        }
        return EDamageType.NORMAL;
    }

    /**
     * Basic roll function from [1, max].
     * @param max
     */
    public roll(max: number): number {
        return Math.floor(Math.random() * max) + 1;
    }

    /**
     * Calculate melee damage roll.
     */
    public meleeDamageRoll(): number {
        if (this.getCharacterDamageType() === EDamageType.STEALTH) {
            if (this.isHidden) {
                return this.roll(8);
            } else {
                return this.roll(4);
            }
        }
        return this.roll(6);
    }

    /**
     * Calculate range damage roll.
     */
    public rangeDamageRoll(): number {
        if (this.getCharacterDamageType() === EDamageType.MAGIC) {
            return this.roll(8);
        }
        return this.roll(6);
    }

    /**
     * Calculate stealth reveal roll.
     */
    public stealthRoll(): number {
        return this.roll(4);
    }

    /**
     * Apply special stat modifying magic.
     */
    public applyMagic(): void {
        // heal bless curse
    }

    public getClassData(): IClassData | undefined {
        return GameFactionData.find(x => x.id === this.faction)?.races.find(x => x.id === this.characterRace)?.classes.find(x => x.id === this.characterClass);
    }

    public static computeHitModifier(attack: Character, defense: Character, damageType: EDamageType): number {
        const attackData = attack.getClassData();
        const defenseData = defense.getClassData();

        switch (damageType) {
            case EDamageType.MAGIC: {
                return attackData.magicAttackHit - defenseData.magicAttackArmor;
            }
            case EDamageType.NORMAL:
            case EDamageType.STEALTH: {
                return attackData.meleeAttackHit - defenseData.meleeAttackArmor;
            }
            case EDamageType.RANGE: {
                return attackData.rangeAttackHit - defenseData.rangeAttackArmor;
            }
        }
    }

    /**
     * Apply damage to this character.
     * @param amount The points of damage.
     * @param damageType The type of damage which has different modifiers
     * @param attacker The attacking character with different modifiers
     */
    public applyDamage(amount: number, damageType: EDamageType, attacker: Character): void {
        const hitRoll = this.roll(20);
        if (hitRoll + Character.computeHitModifier(attacker, this, damageType) < 10) {
            return;
        }
        if (hitRoll === 20) {
            amount *= 2;
        }
        this.hp -= amount;
    }

    /**
     * Apply stealth reveal roll changes to this character.
     * @param amount The random probability of stealth.
     */
    public applyStealth(amount: number): void {
        if (amount === 1) {
            this.isHidden = false;
        }
        if (amount === 4) {
            this.isHidden = true;
        }
    }

    /**
     * Character takes a single turn in the DnD battle.
     */
    public takeTurn(): void {
        if (this.hp <= 0) {
            return;
        }

        if (this.targetCharacter.hp <= 0) {
            // target character is dead
            this.targetCharacter = null;
        }
        if (!this.targetCharacter) {
            // find new target character
            this.targetCharacter = this.battle?.getEnemyCharacter(this);
        }
        if (!this.targetCharacter) {
            // could not find target character
            return;
        }

        // perform battle
        const damageType = this.getCharacterDamageType();
        switch (this.getCharacterHitType()) {
            case EHitType.MELEE: {
                // magic people can apply melee magic
                if (damageType === EDamageType.MAGIC && !this.underMelee) {
                    this.applyMagic();
                    break;
                }
                // stealth people have stealth rolls
                if (damageType === EDamageType.STEALTH && !this.underMelee) {
                    this.applyStealth(this.stealthRoll());
                }
                // melee people must close melee range to begin attacking
                if (this.meleeDistance > 0) {
                    this.meleeDistance -= 1;
                    break;
                }
                // apply melee damage
                this.targetCharacter.applyDamage(this.meleeDamageRoll(), damageType, this);
                break;
            }
            case EHitType.RANGE: {
                // apply range damage
                this.targetCharacter.applyDamage(this.rangeDamageRoll(), damageType, this);
                break;
            }
        }
    }
}