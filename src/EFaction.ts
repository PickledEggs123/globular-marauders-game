import {ICharacterSelectionItem} from "./Interface";
import {EShipActionItemType} from "./Ship";

export enum EFaction {
    DWARVEN = "DWARVEN",
    ELVEN = "ELVEN",
    HUMAN = "HUMAN",
    ORCISH = "ORCISH",
}

export enum ERaceData {
    HUMAN = "HUMAN",
    HALFLING = "HALFLING",
    HALF_ELF = "HALF_ELF",
    ELF = "ELF",
    DWARF = "DWARF",
    GOBLIN = "GOBLIN",
    HOBGOBLIN = "HOBGOBLIN",
    BUGBEAR = "BUGBEAR"
}

export enum EClassData {
    CLERIC = "CLERIC",
    MAGE = "MAGE",
    FIGHTER = "FIGHTER",
    PALADIN = "PALADIN",
    RANGER = "RANGER",
    THIEF = "THIEF",
}

export interface IClassData {
    id: EClassData;
    name: string;
    description: string;
    isMagic: boolean;
    isRange: boolean;
    isMelee: boolean;
    isStealth: boolean;
    magicAttackHit: number;
    rangeAttackHit: number;
    meleeAttackHit: number;
    magicAttackDamage: number;
    rangeAttackDamage: number;
    meleeAttackDamage: number;
    magicAttackArmor: number;
    rangeAttackArmor: number;
    meleeAttackArmor: number;
}

export interface IRaceData {
    id: ERaceData;
    name: string;
    description: string;
    classes: IClassData[];
}

export interface IFactionData {
    id: EFaction;
    name: string;
    description: string;
    races: IRaceData[];
    defaultCharacterSelection: ICharacterSelectionItem[];
}

export interface ISpellData {
    id: string;
    name: string;
    description: string;
    actionType: EShipActionItemType;
    hasDirection: boolean;
    coolDownTicks: number;
}

export const GetSpellData = (characterClass: EClassData): ISpellData[] => {
    switch (characterClass) {
        case EClassData.CLERIC: {
            return [{
                id: "cleric-ironwood",
                name: "Ironwood",
                description: "Apply magic to the hull to make it tougher.",
                actionType: EShipActionItemType.IRONWOOD,
                hasDirection: false,
                coolDownTicks: 30 * 10,
            }];
        }
        case EClassData.MAGE: {
            return [{
                id: "mage-fireball",
                name: "Fireball",
                description: "Shoot a large ball of fire at the enemy.",
                actionType: EShipActionItemType.FIREBALL,
                hasDirection: true,
                coolDownTicks: 10 * 10,
            }, {
                id: "mage-sleep",
                name: "Sleep",
                description: "Shoot a large ball of sleepiness at the enemy.",
                actionType: EShipActionItemType.SLEEP,
                hasDirection: true,
                coolDownTicks: 10 * 10,
            }];
        }
        default: {
            return [];
        }
    }
}

export const GameFactionData: IFactionData[] = [{
    id: EFaction.DWARVEN,
    name: "The Dwarves",
    description: "A short and stout race of strong melee fighters. They use advanced mining techniques to produce the strongest armor.",
    races: [{
        id: ERaceData.DWARF,
        name: "Dwarf",
        description: "A short and stout humanoid with strong melee stats.",
        classes: [{
            id: EClassData.CLERIC,
            name: "Dwarven Cleric",
            description: "A holy man of the dwarven race. He can bless and curse people to buff and nerf the enemy.",
            isMagic: true,
            isRange: false,
            isMelee: true,
            isStealth: false,
            magicAttackHit: 5,
            rangeAttackHit: 2,
            meleeAttackHit: 5,
            magicAttackDamage: 2,
            rangeAttackDamage: 3,
            meleeAttackDamage: 5,
            magicAttackArmor: 3,
            rangeAttackArmor: 7,
            meleeAttackArmor: 3,
        }, {
            id: EClassData.FIGHTER,
            name: "Dwarven Fighter",
            description: "A strong man of the dwarven race. Likes to smash people with his hammer.",
            isMagic: false,
            isRange: false,
            isMelee: true,
            isStealth: false,
            magicAttackHit: 2,
            rangeAttackHit: 2,
            meleeAttackHit: 7,
            magicAttackDamage: 2,
            rangeAttackDamage: 3,
            meleeAttackDamage: 7,
            magicAttackArmor: 3,
            rangeAttackArmor: 11,
            meleeAttackArmor: 5,
        }]
    }],
    defaultCharacterSelection: [{
        faction: EFaction.DWARVEN,
        characterRace: ERaceData.DWARF,
        characterClass: EClassData.CLERIC,
        amount: 1
    }, {
        faction: EFaction.DWARVEN,
        characterRace: ERaceData.DWARF,
        characterClass: EClassData.FIGHTER,
        amount: 4
    }]
}, {
    id: EFaction.ELVEN,
    name: "The Elves",
    description: "A tall and skinny race of strong mages and rangers. They study magic to unlock arcane secrets to light and strong armor. They are also skilled with the bow.",
    races: [{
        id: ERaceData.ELF,
        name: "Elf",
        description: "A tall and skinny humanoid with strong magic stats.",
        classes: [{
            id: EClassData.MAGE,
            name: "Elven Mage",
            description: "A magician of the elven race. He can fire magic missiles from long distances at people.",
            isMagic: true,
            isRange: true,
            isMelee: true,
            isStealth: false,
            magicAttackHit: 7,
            rangeAttackHit: 3,
            meleeAttackHit: 3,
            magicAttackDamage: 5,
            rangeAttackDamage: 3,
            meleeAttackDamage: 3,
            magicAttackArmor: 5,
            rangeAttackArmor: 4,
            meleeAttackArmor: 5,
        }, {
            id: EClassData.FIGHTER,
            name: "Elven Fighter",
            description: "A swordsman of the elven race. He uses elven armor for it's lightness and strength to his advantage.",
            isMagic: false,
            isRange: false,
            isMelee: true,
            isStealth: false,
            magicAttackHit: 2,
            rangeAttackHit: 3,
            meleeAttackHit: 5,
            magicAttackDamage: 2,
            rangeAttackDamage: 3,
            meleeAttackDamage: 5,
            magicAttackArmor: 7,
            rangeAttackArmor: 13,
            meleeAttackArmor: 7,
        }, {
            id: EClassData.RANGER,
            name: "Elven Ranger",
            description: "A ranger of the elven race. He likes his bow and he is skilled with it.",
            isMagic: false,
            isRange: true,
            isMelee: true,
            isStealth: false,
            magicAttackHit: 2,
            rangeAttackHit: 7,
            meleeAttackHit: 3,
            magicAttackDamage: 2,
            rangeAttackDamage: 7,
            meleeAttackDamage: 3,
            magicAttackArmor: 4,
            rangeAttackArmor: 6,
            meleeAttackArmor: 4,
        }, {
            id: EClassData.THIEF,
            name: "Elven Thief",
            description: "A thief of the elven race. He likes to use stealth to attack people.",
            isMagic: false,
            isRange: false,
            isMelee: true,
            isStealth: true,
            magicAttackHit: 2,
            rangeAttackHit: 2,
            meleeAttackHit: 5,
            magicAttackDamage: 2,
            rangeAttackDamage: 2,
            meleeAttackDamage: 5,
            magicAttackArmor: 3,
            rangeAttackArmor: 5,
            meleeAttackArmor: 3,
        }]
    }],
    defaultCharacterSelection: [{
        faction: EFaction.ELVEN,
        characterRace: ERaceData.ELF,
        characterClass: EClassData.MAGE,
        amount: 1
    }, {
        faction: EFaction.ELVEN,
        characterRace: ERaceData.ELF,
        characterClass: EClassData.RANGER,
        amount: 2
    }, {
        faction: EFaction.ELVEN,
        characterRace: ERaceData.ELF,
        characterClass: EClassData.FIGHTER,
        amount: 1
    }, {
        faction: EFaction.ELVEN,
        characterRace: ERaceData.ELF,
        characterClass: EClassData.THIEF,
        amount: 1
    }]
}, {
    id: EFaction.HUMAN,
    name: "The Humans",
    description: "An average race of many classes. They are the newest of the space faring races. They are average in all stats.",
    races: [{
        id: ERaceData.HUMAN,
        name: "Human",
        description: "An average humanoid.",
        classes: [{
            id: EClassData.CLERIC,
            name: "Human Cleric",
            description: "A holy man of the human race. He can bless and curse people to buff and nerf the enemy.",
            isMagic: true,
            isRange: false,
            isMelee: true,
            isStealth: false,
            magicAttackHit: 4,
            rangeAttackHit: 2,
            meleeAttackHit: 4,
            magicAttackDamage: 4,
            rangeAttackDamage: 3,
            meleeAttackDamage: 3,
            magicAttackArmor: 3,
            rangeAttackArmor: 7,
            meleeAttackArmor: 3,
        }, {
            id: EClassData.MAGE,
            name: "Human Mage",
            description: "A magician of the human race. He can fire magic missiles from long distances at people.",
            isMagic: true,
            isRange: true,
            isMelee: true,
            isStealth: false,
            magicAttackHit: 8,
            rangeAttackHit: 3,
            meleeAttackHit: 3,
            magicAttackDamage: 4,
            rangeAttackDamage: 3,
            meleeAttackDamage: 3,
            magicAttackArmor: 5,
            rangeAttackArmor: 6,
            meleeAttackArmor: 3,
        }, {
            id: EClassData.FIGHTER,
            name: "Human Fighter",
            description: "A swordsman of the human race.",
            isMagic: false,
            isRange: false,
            isMelee: true,
            isStealth: false,
            magicAttackHit: 2,
            rangeAttackHit: 3,
            meleeAttackHit: 5,
            magicAttackDamage: 2,
            rangeAttackDamage: 3,
            meleeAttackDamage: 7,
            magicAttackArmor: 5,
            rangeAttackArmor: 11,
            meleeAttackArmor: 5,
        }, {
            id: EClassData.PALADIN,
            name: "Human Paladin",
            description: "A magical swordsman of the human race.",
            isMagic: true,
            isRange: false,
            isMelee: true,
            isStealth: false,
            magicAttackHit: 6,
            rangeAttackHit: 3,
            meleeAttackHit: 6,
            magicAttackDamage: 5,
            rangeAttackDamage: 3,
            meleeAttackDamage: 7,
            magicAttackArmor: 4,
            rangeAttackArmor: 10,
            meleeAttackArmor: 4,
        }, {
            id: EClassData.RANGER,
            name: "Human Ranger",
            description: "A ranger of the human race. He likes his bow and he is skilled with it.",
            isMagic: false,
            isRange: true,
            isMelee: true,
            isStealth: false,
            magicAttackHit: 2,
            rangeAttackHit: 6,
            meleeAttackHit: 3,
            magicAttackDamage: 2,
            rangeAttackDamage: 6,
            meleeAttackDamage: 3,
            magicAttackArmor: 3,
            rangeAttackArmor: 7,
            meleeAttackArmor: 3,
        }, {
            id: EClassData.THIEF,
            name: "Human Thief",
            description: "A thief of the human race. He likes to use stealth to attack people.",
            isMagic: false,
            isRange: false,
            isMelee: true,
            isStealth: true,
            magicAttackHit: 2,
            rangeAttackHit: 2,
            meleeAttackHit: 5,
            magicAttackDamage: 2,
            rangeAttackDamage: 2,
            meleeAttackDamage: 5,
            magicAttackArmor: 3,
            rangeAttackArmor: 5,
            meleeAttackArmor: 3,
        }]
    }, {
        id: ERaceData.HALFLING,
        name: "Halfling",
        description: "A short humanoid of the human race.",
        classes: [{
            id: EClassData.FIGHTER,
            name: "Halfling Fighter",
            description: "A swordsman of the halfling race.",
            isMagic: false,
            isRange: false,
            isMelee: true,
            isStealth: false,
            magicAttackHit: 2,
            rangeAttackHit: 3,
            meleeAttackHit: 4,
            magicAttackDamage: 2,
            rangeAttackDamage: 3,
            meleeAttackDamage: 6,
            magicAttackArmor: 5,
            rangeAttackArmor: 7,
            meleeAttackArmor: 5,
        }, {
            id: EClassData.THIEF,
            name: "Halfling Thief",
            description: "A thief of the halfling race. He likes to use stealth to attack people.",
            isMagic: false,
            isRange: false,
            isMelee: true,
            isStealth: true,
            magicAttackHit: 2,
            rangeAttackHit: 2,
            meleeAttackHit: 4,
            magicAttackDamage: 2,
            rangeAttackDamage: 2,
            meleeAttackDamage: 4,
            magicAttackArmor: 3,
            rangeAttackArmor: 5,
            meleeAttackArmor: 3,
        }]
    }],
    defaultCharacterSelection: [{
        faction: EFaction.HUMAN,
        characterRace: ERaceData.HUMAN,
        characterClass: EClassData.MAGE,
        amount: 1
    }, {
        faction: EFaction.HUMAN,
        characterRace: ERaceData.HUMAN,
        characterClass: EClassData.FIGHTER,
        amount: 1
    }, {
        faction: EFaction.HUMAN,
        characterRace: ERaceData.HUMAN,
        characterClass: EClassData.PALADIN,
        amount: 1
    }, {
        faction: EFaction.HUMAN,
        characterRace: ERaceData.HUMAN,
        characterClass: EClassData.RANGER,
        amount: 1
    }, {
        faction: EFaction.HUMAN,
        characterRace: ERaceData.HALFLING,
        characterClass: EClassData.THIEF,
        amount: 1
    }]
}, {
    id: EFaction.ORCISH,
    name: "The Orcs",
    description: "A Faction of Evil beings. They're many sub variants of Orcs. They like to annoy their neighbors with frequent raids. They are average in all stats.",
    races: [{
        id: ERaceData.HOBGOBLIN,
        name: "HobGoblin",
        description: "An average but ugly humanoid.",
        classes: [{
            id: EClassData.MAGE,
            name: "Hobgoblin Mage",
            description: "A magician of the orc race. He can fire magic missiles from long distances at people.",
            isMagic: true,
            isRange: true,
            isMelee: true,
            isStealth: false,
            magicAttackHit: 8,
            rangeAttackHit: 3,
            meleeAttackHit: 3,
            magicAttackDamage: 4,
            rangeAttackDamage: 3,
            meleeAttackDamage: 3,
            magicAttackArmor: 5,
            rangeAttackArmor: 5,
            meleeAttackArmor: 3,
        }, {
            id: EClassData.FIGHTER,
            name: "Hobgoblin Fighter",
            description: "A swordsman of the orc race.",
            isMagic: false,
            isRange: false,
            isMelee: true,
            isStealth: false,
            magicAttackHit: 2,
            rangeAttackHit: 3,
            meleeAttackHit: 5,
            magicAttackDamage: 2,
            rangeAttackDamage: 3,
            meleeAttackDamage: 7,
            magicAttackArmor: 5,
            rangeAttackArmor: 8,
            meleeAttackArmor: 5,
        }, {
            id: EClassData.RANGER,
            name: "Hobgoblin Ranger",
            description: "A ranger of the human race. He likes his bow and he is skilled with it.",
            isMagic: false,
            isRange: true,
            isMelee: true,
            isStealth: false,
            magicAttackHit: 2,
            rangeAttackHit: 6,
            meleeAttackHit: 3,
            magicAttackDamage: 2,
            rangeAttackDamage: 6,
            meleeAttackDamage: 3,
            magicAttackArmor: 3,
            rangeAttackArmor: 5,
            meleeAttackArmor: 3,
        }, {
            id: EClassData.THIEF,
            name: "Hobgoblin Thief",
            description: "A thief of the human race. He likes to use stealth to attack people.",
            isMagic: false,
            isRange: false,
            isMelee: true,
            isStealth: true,
            magicAttackHit: 2,
            rangeAttackHit: 2,
            meleeAttackHit: 5,
            magicAttackDamage: 2,
            rangeAttackDamage: 2,
            meleeAttackDamage: 5,
            magicAttackArmor: 3,
            rangeAttackArmor: 5,
            meleeAttackArmor: 3,
        }]
    }, {
        id: ERaceData.GOBLIN,
        name: "Goblin",
        description: "A short humanoid of the orc race.",
        classes: [{
            id: EClassData.FIGHTER,
            name: "Goblin Fighter",
            description: "A swordsman of the orc race.",
            isMagic: false,
            isRange: false,
            isMelee: true,
            isStealth: false,
            magicAttackHit: 2,
            rangeAttackHit: 3,
            meleeAttackHit: 4,
            magicAttackDamage: 2,
            rangeAttackDamage: 3,
            meleeAttackDamage: 6,
            magicAttackArmor: 5,
            rangeAttackArmor: 5,
            meleeAttackArmor: 5,
        }, {
            id: EClassData.THIEF,
            name: "Goblin Thief",
            description: "A thief of the orc race. He likes to use stealth to attack people.",
            isMagic: false,
            isRange: false,
            isMelee: true,
            isStealth: true,
            magicAttackHit: 2,
            rangeAttackHit: 2,
            meleeAttackHit: 4,
            magicAttackDamage: 2,
            rangeAttackDamage: 2,
            meleeAttackDamage: 4,
            magicAttackArmor: 3,
            rangeAttackArmor: 5,
            meleeAttackArmor: 3,
        }]
    }, {
        id: ERaceData.BUGBEAR,
        name: "Bug Bear",
        description: "A large humanoid of the orc race.",
        classes: [{
            id: EClassData.FIGHTER,
            name: "Bug Bear Fighter",
            description: "A swordsman of the orc race.",
            isMagic: false,
            isRange: false,
            isMelee: true,
            isStealth: false,
            magicAttackHit: 2,
            rangeAttackHit: 3,
            meleeAttackHit: 7,
            magicAttackDamage: 2,
            rangeAttackDamage: 3,
            meleeAttackDamage: 9,
            magicAttackArmor: 5,
            rangeAttackArmor: 8,
            meleeAttackArmor: 5,
        }]
    }],
    defaultCharacterSelection: [{
        faction: EFaction.ORCISH,
        characterRace: ERaceData.BUGBEAR,
        characterClass: EClassData.FIGHTER,
        amount: 1
    }, {
        faction: EFaction.ORCISH,
        characterRace: ERaceData.HOBGOBLIN,
        characterClass: EClassData.MAGE,
        amount: 1
    }, {
        faction: EFaction.ORCISH,
        characterRace: ERaceData.HOBGOBLIN,
        characterClass: EClassData.FIGHTER,
        amount: 1
    }, {
        faction: EFaction.ORCISH,
        characterRace: ERaceData.GOBLIN,
        characterClass: EClassData.FIGHTER,
        amount: 1
    }, {
        faction: EFaction.ORCISH,
        characterRace: ERaceData.GOBLIN,
        characterClass: EClassData.THIEF,
        amount: 1
    }]
}];
