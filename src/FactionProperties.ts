import {EShipType} from "./ShipType";
import {EFaction} from "./EFaction";

export interface IFactionProperties {
    shipTypes: EShipType[];
    fastWoodProduction: boolean;
    piracyMultiple: number;
    settlementMultiple: number;
}

export const DEFAULT_FACTION_PROPERTIES: Record<EFaction, IFactionProperties> = {
    [EFaction.DWARVEN]: {
        shipTypes: [EShipType.CUTTER, EShipType.SLOOP, EShipType.CORVETTE, EShipType.BRIGANTINE],
        fastWoodProduction: true,
        piracyMultiple: 2,
        settlementMultiple: 1,
    },
    [EFaction.ELVEN]: {
        shipTypes: [EShipType.CUTTER, EShipType.SLOOP, EShipType.CORVETTE, EShipType.BRIGANTINE, EShipType.BRIG, EShipType.FRIGATE],
        fastWoodProduction: false,
        piracyMultiple: 3,
        settlementMultiple: 1.5,
    },
    [EFaction.HUMAN]: {
        shipTypes: [EShipType.CUTTER, EShipType.SLOOP, EShipType.CORVETTE, EShipType.BRIGANTINE, EShipType.BRIG, EShipType.FRIGATE],
        fastWoodProduction: false,
        piracyMultiple: 2,
        settlementMultiple: 1,
    },
    [EFaction.SPANISH]: {
        shipTypes: [EShipType.CUTTER, EShipType.SLOOP, EShipType.CORVETTE, EShipType.BRIGANTINE, EShipType.BRIG, EShipType.FRIGATE, EShipType.GALLEON],
        fastWoodProduction: false,
        piracyMultiple: 0,
        settlementMultiple: 1.5,
    },
    [EFaction.ORCISH]: {
        shipTypes: [EShipType.CUTTER, EShipType.SLOOP, EShipType.CORVETTE],
        fastWoodProduction: false,
        piracyMultiple: 1,
        settlementMultiple: 1,
    },
};