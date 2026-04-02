import type { StorageOutputs, CapacityUnit } from '../types';
import { formatCapacity } from '../calculationEngine';
import CapacityDonutChart from './CapacityDonutChart';
import Tooltip from './Tooltip';

interface OutputPanelProps {
  outputs: StorageOutputs;
  unit: CapacityUnit;
  onUnitChange: (unit: CapacityUnit) => void;
}

const COLORS = {
  usable: '#22c55e',      // green
  cvm: '#f59e0b',         // amber
  reserve: '#3b82f6',     // blue
  overhead: '#ef4444',    // red (RF/EC overhead)
  savings: '#8b5cf6',     // purple
  failover: '#6366f1',    // indigo
};

function WaterfallRow({ label, value, unit, pct, tooltip, bold, accent }: {
  label: string; value: number; unit: CapacityUnit; pct?: string;
  tooltip?: string; bold?: boolean; accent?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${bold ? 'font-semibold' : ''} ${accent ? 'text-exp-red' : ''}`}>
      <span className="text-sm text-exp-gray-600 flex items-center">
        {label}
        {tooltip && <Tooltip content={tooltip} />}
      </span>
      <div className="text-right">
        <span className={`text-sm ${bold ? 'font-bold text-exp-black' : 'text-exp-gray-600'}`}>
          {formatCapacity(value, unit)}
        </span>
        {pct && <span className="text-xs text-exp-gray-400 ml-2">{pct}</span>}
      </div>
    </div>
  );
}

export default function OutputPanel({ outputs, unit, onUnitChange }: OutputPanelProps) {
  const {
    totalRawCapacityTiB,
    effectiveRawCapacityTiB,
    ecInfo,
    totalExpansionFactor,
    logicalCapacityTiB,
    totalCvmOverheadTiB,
    totalReserveCapacityTiB,
    logicalUsableCapacityTiB,
    operationalCapacityTiB,
    hotDataExpansionFactor,
    coldDataExpansionFactor,
    blendedExpansionFactor,
    warnings,
  } = outputs;

  const donutSegments = [
    { name: 'Usable Capacity', value: logicalUsableCapacityTiB, color: COLORS.usable },
    { name: 'CVM Overhead (6%)', value: totalCvmOverheadTiB, color: COLORS.cvm },
    { name: 'Rebuild Reserve (5%)', value: totalReserveCapacityTiB, color: COLORS.reserve },
  ];

  const rawDonutSegments = [
    { name: 'Effective (after failover)', value: effectiveRawCapacityTiB, color: COLORS.usable },
    { name: 'Failover Reserve', value: totalRawCapacityTiB - effectiveRawCapacityTiB, color: COLORS.failover },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          {warnings.map((w, i) => (
            <p key={i} className="text-sm text-amber-700 flex items-start gap-2">
              <span className="shrink-0">⚠</span>{w}
            </p>
          ))}
        </div>
      )}

      {/* Unit Toggle */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-md shadow-sm">
          {(['TiB', 'TB'] as CapacityUnit[]).map((u) => (
            <button
              key={u}
              onClick={() => onUnitChange(u)}
              className={`px-3 py-1 text-xs font-medium border ${
                unit === u
                  ? 'bg-exp-red text-white border-exp-red'
                  : 'bg-white text-exp-gray-600 border-exp-gray-200 hover:bg-exp-gray-100'
              } ${u === 'TiB' ? 'rounded-l-md' : 'rounded-r-md'}`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Number */}
      <div className="text-center py-4 bg-white rounded-xl border border-exp-gray-200 shadow-sm">
        <p className="text-xs uppercase tracking-wider text-exp-gray-400 mb-1">Operational / Sellable Capacity</p>
        <p className="text-4xl font-bold text-exp-black">{formatCapacity(operationalCapacityTiB, unit)}</p>
        <p className="text-sm text-exp-gray-400 mt-1">
          from {formatCapacity(totalRawCapacityTiB, unit)} raw
        </p>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-exp-gray-200 shadow-sm p-4">
          <h4 className="text-sm font-semibold text-exp-gray-600 mb-3">Logical Capacity Breakdown</h4>
          <CapacityDonutChart
            segments={donutSegments}
            centerLabel="Logical"
            centerValue={formatCapacity(logicalCapacityTiB, unit)}
          />
        </div>

        <div className="bg-white rounded-xl border border-exp-gray-200 shadow-sm p-4">
          <h4 className="text-sm font-semibold text-exp-gray-600 mb-3">Raw Capacity Breakdown</h4>
          <CapacityDonutChart
            segments={rawDonutSegments}
            centerLabel="Total Raw"
            centerValue={formatCapacity(totalRawCapacityTiB, unit)}
          />
        </div>
      </div>

      {/* Capacity Waterfall */}
      <div className="bg-white rounded-xl border border-exp-gray-200 shadow-sm p-4">
        <h4 className="text-sm font-semibold text-exp-gray-600 mb-3">Capacity Waterfall</h4>

        <WaterfallRow label="Total Raw Capacity" value={totalRawCapacityTiB} unit={unit} bold
          tooltip="Sum of all disk capacity across all hosts." />

        <WaterfallRow label="Effective Raw (after failover)" value={effectiveRawCapacityTiB} unit={unit}
          pct={`${((effectiveRawCapacityTiB / totalRawCapacityTiB) * 100).toFixed(0)}% of raw`}
          tooltip="Raw capacity minus failover reserve. N+1 for RF2/RF2.5, N+2 for RF3." />

        <div className="border-t border-exp-gray-100 my-1" />

        {/* EC Info */}
        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm text-exp-gray-600 flex items-center">
            EC Strip
            <Tooltip content="Erasure coding strip configuration: data blocks / parity blocks. Wider strips = lower overhead but require more nodes." />
          </span>
          <span className="text-sm text-exp-gray-600">{ecInfo.stripLabel}</span>
        </div>

        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm text-exp-gray-600 flex items-center">
            Data Expansion Factor
            <Tooltip content={`Hot data: ${hotDataExpansionFactor}x (full replication)${
              coldDataExpansionFactor ? `. Cold data: ${coldDataExpansionFactor.toFixed(2)}x (EC).` : '.'
            } Blended: ${blendedExpansionFactor.toFixed(2)}x. After compression: ${totalExpansionFactor.toFixed(2)}x.`} />
          </span>
          <span className="text-sm font-medium text-exp-gray-600">{totalExpansionFactor.toFixed(2)}x</span>
        </div>

        <div className="border-t border-exp-gray-100 my-1" />

        <WaterfallRow label="Logical Capacity" value={logicalCapacityTiB} unit={unit} bold
          tooltip="Effective raw divided by the total data expansion factor (replication/EC + compression)." />

        <WaterfallRow label="− CVM Overhead (6%)" value={totalCvmOverheadTiB} unit={unit}
          tooltip="Controller VM storage overhead, applied at 6% of logical capacity per tier." />

        <WaterfallRow label="− Rebuild Reserve (5%)" value={totalReserveCapacityTiB} unit={unit}
          tooltip="Reserved capacity for data rebuild operations." />

        <WaterfallRow label="Logical Usable Capacity" value={logicalUsableCapacityTiB} unit={unit} bold
          pct="89% of logical"
          tooltip="Logical capacity minus CVM overhead and rebuild reserve." />

        <div className="border-t border-exp-gray-100 my-1" />

        <WaterfallRow label="Operational / Sellable Capacity" value={operationalCapacityTiB} unit={unit} bold accent
          pct="80% of usable"
          tooltip="Capacity available for customer workloads. 80% of logical usable." />

      </div>

      {/* Per-Tier Detail */}
      {outputs.tiers.length > 1 && (
        <div className="bg-white rounded-xl border border-exp-gray-200 shadow-sm p-4">
          <h4 className="text-sm font-semibold text-exp-gray-600 mb-3">Per-Tier Breakdown</h4>
          <div className="grid grid-cols-2 gap-4">
            {outputs.tiers.map((tier) => (
              <div key={tier.tierName} className="border border-exp-gray-100 rounded-lg p-3">
                <h5 className="text-xs font-semibold uppercase text-exp-gray-400 mb-2">{tier.tierName}</h5>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-exp-gray-500">Raw</span>
                    <span className="font-medium">{formatCapacity(tier.rawTiB, unit)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-exp-gray-500">Logical</span>
                    <span className="font-medium">{formatCapacity(tier.logicalTiB, unit)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-exp-gray-500">CVM Overhead</span>
                    <span className="font-medium">{formatCapacity(tier.cvmOverheadTiB, unit)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
