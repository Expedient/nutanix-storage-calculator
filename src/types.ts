export type WorkloadType = 'NCI' | 'NUS_Files' | 'NUS_Objects';
export type ReplicationFactor = 'RF2' | 'RF2.5' | 'RF3';
export type ErasureCodingState = 'Enabled' | 'Disabled';
export type CapacityUnit = 'TiB' | 'TB';

export interface StorageInputs {
  workloadType: WorkloadType;
  hosts: number;
  nvmeTlcCount: number;
  nvmeTlcCapacity: number;
  nvmeQlcCount: number;
  nvmeQlcCapacity: number;
  hddCount: number;
  hddCapacity: number;
  replicationFactor: ReplicationFactor;
  compressionSavings: number;
  erasureCoding: ErasureCodingState;
  coldDataPercent: number;
  capacityUnit: CapacityUnit;
}

export interface ECInfo {
  dataBlocks: number | null;
  parityBlocks: number | null;
  stripLabel: string;
}

export interface TierCapacity {
  tierName: string;
  rawTB: number;
  rawTiB: number;
  logicalTiB: number;
  cvmOverheadTiB: number;
  reserveTiB: number;
}

export interface StorageOutputs {
  rawNvmeCapacityTB: number;
  rawNvmeCapacityTiB: number;
  rawHddCapacityTB: number;
  rawHddCapacityTiB: number;
  totalRawCapacityTB: number;
  totalRawCapacityTiB: number;
  effectiveRawCapacityTiB: number;
  ecInfo: ECInfo;
  coldDataExpansionFactor: number | null;
  hotDataExpansionFactor: number;
  blendedExpansionFactor: number;
  totalExpansionFactor: number;
  logicalCapacityTiB: number;
  totalCvmOverheadTiB: number;
  totalReserveCapacityTiB: number;
  logicalUsableCapacityTiB: number;
  operationalCapacityTiB: number;
  tiers: TierCapacity[];
  disksPerHost: number;
  warnings: string[];
}

export const TB_TO_TIB = 1 / 1.09951162778;

export const CONSTANTS = {
  TB_TO_TIB,
  LOGICAL_TO_USABLE: 0.95,  // 1 - CVM(6%) + Reserve(5%) but we apply separately
  CVM_OVERHEAD: 0.06,
  REBUILD_RESERVE: 0.05,
  USABLE_TO_OPERATIONAL: 0.80,
};
