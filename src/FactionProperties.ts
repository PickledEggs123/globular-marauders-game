import {EShipType} from "./ShipType";
import {EFaction} from "./EFaction";

export interface IFactionProperties {
    shipTypes: EShipType[];
    fastWoodProduction: boolean;
    piracyMultiple: number;
    settlementMultiple: number;
}

export const DEFAULT_FACTION_PROPERTIES: Record<EFaction, IFactionProperties> = {
    [EFaction.DUTCH]: {
        shipTypes: [EShipType.CUTTER, EShipType.SLOOP, EShipType.CORVETTE, EShipType.BRIGANTINE],
        fastWoodProduction: true,
        piracyMultiple: 2,
        settlementMultiple: 1,
    },
    [EFaction.ENGLISH]: {
        shipTypes: [EShipType.CUTTER, EShipType.SLOOP, EShipType.CORVETTE, EShipType.BRIGANTINE, EShipType.BRIG, EShipType.FRIGATE],
        fastWoodProduction: false,
        piracyMultiple: 3,
        settlementMultiple: 1.5,
    },
    [EFaction.FRENCH]: {
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
    [EFaction.PORTUGUESE]: {
        shipTypes: [EShipType.CUTTER, EShipType.SLOOP, EShipType.CORVETTE],
        fastWoodProduction: false,
        piracyMultiple: 1,
        settlementMultiple: 1,
    },
};