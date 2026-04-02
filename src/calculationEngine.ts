import type { StorageInputs, StorageOutputs, ECInfo, TierCapacity } from './types';
import { CONSTANTS } from './types';

const { TB_TO_TIB, CVM_OVERHEAD, REBUILD_RESERVE, USABLE_TO_OPERATIONAL } = CONSTANTS;

export function getECInfo(inputs: StorageInputs): ECInfo {
  const { workloadType, replicationFactor: rf, hosts, erasureCoding } = inputs;
  const disksPerHost = inputs.nvmeTlcCount + inputs.nvmeQlcCount + inputs.hddCount;
  const isNUS = workloadType !== 'NCI';
  const hasWideStrips = isNUS && disksPerHost >= 20;

  if (erasureCoding === 'Disabled') {
    return { dataBlocks: null, parityBlocks: null, stripLabel: 'Disabled' };
  }

  let dataBlocks: number | null = null;
  let parityBlocks: number | null = null;

  if (rf === 'RF2') {
    // RF2 EC: parity=1, data blocks scale with nodes
    if (hosts < 4) {
      return { dataBlocks: null, parityBlocks: null, stripLabel: 'N/A (min 4 nodes)' };
    }
    parityBlocks = 1;
    if (isNUS && hasWideStrips) {
      // NUS with wide strips: scale up to 12
      dataBlocks = Math.min(hosts - 1, 12);
    } else {
      // Standard NCI: 4→3, 5+→4
      dataBlocks = hosts === 4 ? 3 : 4;
    }
  } else if (rf === 'RF2.5') {
    // RF2.5 (FT1n:2d): NUS only, requires 20+ disks/host
    if (!isNUS || disksPerHost < 20) {
      return { dataBlocks: null, parityBlocks: null, stripLabel: 'N/A (requires NUS + 20+ disks/host)' };
    }
    if (hosts < 5) {
      return { dataBlocks: null, parityBlocks: null, stripLabel: 'N/A (min 5 nodes for FT2)' };
    }
    parityBlocks = 2;
    // Wider strip sizes for RF2.5
    if (hosts === 5) dataBlocks = 6;
    else if (hosts === 6) dataBlocks = 8;
    else if (hosts === 7) dataBlocks = 10;
    else dataBlocks = 12; // 8+
  } else if (rf === 'RF3') {
    if (hosts < 5) {
      return { dataBlocks: null, parityBlocks: null, stripLabel: 'N/A (min 5 nodes for FT2)' };
    }
    parityBlocks = 2;
    if (isNUS && hasWideStrips) {
      // NUS RF3 with wide strips: scale up to 12
      dataBlocks = Math.min(hosts - 2, 12);
    } else {
      // Standard AOS RF3 EC: MIN(nodes-2, 4), minimum 6 nodes
      if (hosts < 6) {
        return { dataBlocks: null, parityBlocks: null, stripLabel: 'N/A (min 6 nodes for RF3 EC)' };
      }
      dataBlocks = Math.min(hosts - 2, 4);
    }
  }

  if (dataBlocks === null || parityBlocks === null) {
    return { dataBlocks: null, parityBlocks: null, stripLabel: 'N/A' };
  }

  const overhead = ((dataBlocks + parityBlocks) / dataBlocks);
  return {
    dataBlocks,
    parityBlocks,
    stripLabel: `${dataBlocks}/${parityBlocks} (${overhead.toFixed(2)}x overhead)`,
  };
}

export function getMinNodes(rf: string): number {
  if (rf === 'RF2') return 3;
  if (rf === 'RF2.5') return 5; // FT2 required
  if (rf === 'RF3') return 5;   // FT2 required
  return 1;
}

export function getFailoverNodes(rf: string): number {
  // RF2.5 is FT2 cluster but N+1 for node fault tolerance
  if (rf === 'RF3') return 2;
  return 1; // RF2 and RF2.5
}

export function calculate(inputs: StorageInputs): StorageOutputs {
  const warnings: string[] = [];
  const disksPerHost = inputs.nvmeTlcCount + inputs.nvmeQlcCount + inputs.hddCount;
  const isNUS = inputs.workloadType !== 'NCI';

  // Validate inputs
  const minNodes = getMinNodes(inputs.replicationFactor);
  if (inputs.hosts < minNodes) {
    warnings.push(`${inputs.replicationFactor} requires at least ${minNodes} nodes.`);
  }

  if (inputs.replicationFactor === 'RF2.5' && !isNUS) {
    warnings.push('RF2.5 (FT1n:2d) is only available for NUS workloads.');
  }

  if (inputs.replicationFactor === 'RF2.5' && disksPerHost < 20) {
    warnings.push('RF2.5 (FT1n:2d) requires 20 or more disks per host.');
  }

  // Raw capacities
  const rawNvmeCapacityTB = inputs.hosts * (
    (inputs.nvmeTlcCount * inputs.nvmeTlcCapacity) +
    (inputs.nvmeQlcCount * inputs.nvmeQlcCapacity)
  );
  const rawNvmeCapacityTiB = rawNvmeCapacityTB * TB_TO_TIB;

  const rawHddCapacityTB = inputs.hosts * inputs.hddCount * inputs.hddCapacity;
  const rawHddCapacityTiB = rawHddCapacityTB * TB_TO_TIB;

  const totalRawCapacityTB = rawNvmeCapacityTB + rawHddCapacityTB;
  const totalRawCapacityTiB = rawNvmeCapacityTiB + rawHddCapacityTiB;

  // Effective raw (after failover reserve)
  const failoverNodes = getFailoverNodes(inputs.replicationFactor);
  const failoverFactor = Math.min(1, (inputs.hosts - failoverNodes) / inputs.hosts);
  const effectiveRawCapacityTiB = totalRawCapacityTiB * failoverFactor;

  // EC info
  const ecInfo = getECInfo(inputs);

  // Expansion factors
  const hotDataExpansionFactor = inputs.replicationFactor === 'RF2' ? 2 :
    inputs.replicationFactor === 'RF2.5' ? 3 : 3; // RF2.5 and RF3 both use 3x for hot data (FT2)

  let coldDataExpansionFactor: number | null = null;
  let blendedExpansionFactor: number;

  if (inputs.erasureCoding === 'Enabled' && ecInfo.dataBlocks !== null && ecInfo.parityBlocks !== null) {
    coldDataExpansionFactor = (ecInfo.dataBlocks + ecInfo.parityBlocks) / ecInfo.dataBlocks;
    blendedExpansionFactor = (inputs.coldDataPercent * coldDataExpansionFactor) +
      ((1 - inputs.coldDataPercent) * hotDataExpansionFactor);
  } else {
    blendedExpansionFactor = hotDataExpansionFactor;
  }

  // Apply compression
  const totalExpansionFactor = blendedExpansionFactor * (1 - inputs.compressionSavings);

  // Logical capacity
  const logicalCapacityTiB = totalExpansionFactor > 0
    ? effectiveRawCapacityTiB / totalExpansionFactor
    : 0;

  // Per-tier breakdown (CVM overhead applied per tier proportionally)
  const tiers: TierCapacity[] = [];

  if (rawNvmeCapacityTB > 0) {
    const nvmeRatio = rawNvmeCapacityTiB / totalRawCapacityTiB;
    const tierLogical = logicalCapacityTiB * nvmeRatio;
    tiers.push({
      tierName: 'NVMe/SSD',
      rawTB: rawNvmeCapacityTB,
      rawTiB: rawNvmeCapacityTiB,
      logicalTiB: tierLogical,
      cvmOverheadTiB: tierLogical * CVM_OVERHEAD,
      reserveTiB: tierLogical * REBUILD_RESERVE,
    });
  }

  if (rawHddCapacityTB > 0) {
    const hddRatio = rawHddCapacityTiB / totalRawCapacityTiB;
    const tierLogical = logicalCapacityTiB * hddRatio;
    tiers.push({
      tierName: 'HDD',
      rawTB: rawHddCapacityTB,
      rawTiB: rawHddCapacityTiB,
      logicalTiB: tierLogical,
      cvmOverheadTiB: tierLogical * CVM_OVERHEAD,
      reserveTiB: tierLogical * REBUILD_RESERVE,
    });
  }

  // Totals
  const totalCvmOverheadTiB = logicalCapacityTiB * CVM_OVERHEAD;
  const totalReserveCapacityTiB = logicalCapacityTiB * REBUILD_RESERVE;
  const logicalUsableCapacityTiB = logicalCapacityTiB - totalCvmOverheadTiB - totalReserveCapacityTiB;
  const operationalCapacityTiB = logicalUsableCapacityTiB * USABLE_TO_OPERATIONAL;

  return {
    rawNvmeCapacityTB,
    rawNvmeCapacityTiB,
    rawHddCapacityTB,
    rawHddCapacityTiB,
    totalRawCapacityTB,
    totalRawCapacityTiB,
    effectiveRawCapacityTiB,
    ecInfo,
    coldDataExpansionFactor,
    hotDataExpansionFactor,
    blendedExpansionFactor,
    totalExpansionFactor,
    logicalCapacityTiB,
    totalCvmOverheadTiB,
    totalReserveCapacityTiB,
    logicalUsableCapacityTiB,
    operationalCapacityTiB,
    tiers,
    disksPerHost,
    warnings,
  };
}

export function formatCapacity(tib: number, unit: 'TiB' | 'TB'): string {
  if (unit === 'TB') {
    const tb = tib / TB_TO_TIB;
    return tb >= 1000 ? `${(tb / 1000).toFixed(2)} PB` : `${tb.toFixed(2)} TB`;
  }
  return tib >= 1024 ? `${(tib / 1024).toFixed(2)} PiB` : `${tib.toFixed(2)} TiB`;
}

export function formatCapacityShort(tib: number, unit: 'TiB' | 'TB'): string {
  if (unit === 'TB') {
    const tb = tib / TB_TO_TIB;
    return tb >= 1000 ? `${(tb / 1000).toFixed(1)} PB` : `${tb.toFixed(1)} TB`;
  }
  return tib >= 1024 ? `${(tib / 1024).toFixed(1)} PiB` : `${tib.toFixed(1)} TiB`;
}
