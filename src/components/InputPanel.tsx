import type { StorageInputs, WorkloadType, ReplicationFactor } from '../types';
import { getMinNodes } from '../calculationEngine';
import Tooltip from './Tooltip';

interface InputPanelProps {
  inputs: StorageInputs;
  onChange: (inputs: StorageInputs) => void;
  disksPerHost: number;
}

const HOSTS = Array.from({ length: 16 }, (_, i) => i + 1);
const TLC_COUNTS = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const TLC_CAPACITIES = [1.92, 3.84, 6.4, 7.68, 15.36];
const QLC_COUNTS = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
const QLC_CAPACITIES = [30.72, 61.44, 122.88];
const HDD_COUNTS = [0, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
const HDD_CAPACITIES = [20, 22, 24, 28, 30, 32, 36];
const COMPRESSION_OPTIONS = [0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35];
const COLD_DATA_OPTIONS = [0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50,
  0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95, 1.0];

function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
  tooltip,
  disabled,
  formatOption,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (v: T) => void;
  tooltip?: string;
  disabled?: boolean;
  formatOption?: (v: T) => string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <label className="text-sm font-medium text-exp-gray-600 flex items-center shrink-0">
        {label}
        {tooltip && <Tooltip content={tooltip} />}
      </label>
      <select
        value={String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          onChange((typeof value === 'number' ? Number(raw) : raw) as T);
        }}
        disabled={disabled}
        className="w-36 px-2.5 py-1.5 text-sm bg-white border border-exp-gray-200 rounded-md shadow-sm focus:ring-2 focus:ring-exp-red focus:border-exp-red disabled:opacity-50 disabled:bg-exp-gray-100 text-right appearance-none cursor-pointer"
      >
        {options.map((opt) => (
          <option key={String(opt)} value={String(opt)}>
            {formatOption ? formatOption(opt) : String(opt)}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function InputPanel({ inputs, onChange, disksPerHost }: InputPanelProps) {
  const update = <K extends keyof StorageInputs>(key: K, value: StorageInputs[K]) => {
    const next = { ...inputs, [key]: value };

    // Auto-correct RF if switching to NCI and RF2.5 is selected
    if (key === 'workloadType' && value === 'NCI' && next.replicationFactor === 'RF2.5') {
      next.replicationFactor = 'RF2';
    }

    // Auto-correct if RF2.5 selected but disks < 20
    const nextDisks = next.nvmeTlcCount + next.nvmeQlcCount + next.hddCount;
    if (next.replicationFactor === 'RF2.5' && nextDisks < 20) {
      // Don't auto-correct disk counts, just show warning
    }

    // Auto-correct host count for RF minimum
    const minNodes = getMinNodes(next.replicationFactor);
    if (next.hosts < minNodes) {
      next.hosts = minNodes;
    }

    onChange(next);
  };

  const isNUS = inputs.workloadType !== 'NCI';
  const rf25Available = isNUS && disksPerHost >= 20;
  const rfOptions: ReplicationFactor[] = isNUS
    ? (rf25Available ? ['RF2', 'RF2.5', 'RF3'] : ['RF2', 'RF3'])
    : ['RF2', 'RF3'];

  const minNodes = getMinNodes(inputs.replicationFactor);
  const hostOptions = HOSTS.filter(h => h >= minNodes);

  const ecMinNodes = inputs.replicationFactor === 'RF2' ? 4 :
    inputs.replicationFactor === 'RF3' ? (isNUS ? 5 : 6) : 5;
  const ecAvailable = inputs.hosts >= ecMinNodes;

  return (
    <div className="flex flex-col gap-1">
      {/* Workload Type */}
      <div className="border-b border-exp-gray-200 pb-3 mb-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-exp-gray-400 mb-2">Platform</h3>
        <Select
          label="Workload Type"
          value={inputs.workloadType}
          options={['NCI', 'NUS_Files', 'NUS_Objects'] as WorkloadType[]}
          onChange={(v) => update('workloadType', v)}
          formatOption={(v) => v === 'NCI' ? 'NCI (Standard)' : v === 'NUS_Files' ? 'NUS (Files)' : 'NUS (Objects)'}
          tooltip="NCI = Nutanix Cloud Infrastructure (standard workloads). NUS = Nutanix Unified Storage (Files or Objects). RF2.5 and wider EC strips are only available on dedicated NUS clusters."
        />
      </div>

      {/* Cluster Config */}
      <div className="border-b border-exp-gray-200 pb-3 mb-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-exp-gray-400 mb-2">Cluster</h3>
        <Select
          label="Hosts"
          value={inputs.hosts}
          options={hostOptions}
          onChange={(v) => update('hosts', v)}
        />
        <Select
          label="Replication Factor"
          value={inputs.replicationFactor}
          options={rfOptions}
          onChange={(v) => update('replicationFactor', v)}
          tooltip={
            inputs.replicationFactor === 'RF2'
              ? 'RF2 (FT1): 2 copies of data. Tolerates 1 node or disk failure (N+1).'
              : inputs.replicationFactor === 'RF2.5'
              ? 'RF2.5 (FT1n:2d): Available for NUS only with 20+ disks/host. Uses FT2 cluster setting with N+1 node fault tolerance but N+2 disk fault tolerance. Enables wider EC stripe sizes.'
              : 'RF3 (FT2): 3 copies of data. Tolerates 2 simultaneous node or disk failures (N+2). Minimum 5 nodes.'
          }
        />
      </div>

      {/* Disk Configuration */}
      <div className="border-b border-exp-gray-200 pb-3 mb-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-exp-gray-400 mb-2">
          Disks Per Host
          <span className="ml-2 text-exp-gray-400 font-normal normal-case">
            ({disksPerHost} total)
          </span>
        </h3>

        <div className="space-y-0.5">
          <p className="text-xs text-exp-gray-400 font-medium mt-1 mb-0.5">NVMe TLC</p>
          <Select label="Count" value={inputs.nvmeTlcCount} options={TLC_COUNTS} onChange={(v) => update('nvmeTlcCount', v)} />
          {inputs.nvmeTlcCount > 0 && (
            <Select label="Capacity" value={inputs.nvmeTlcCapacity} options={TLC_CAPACITIES} onChange={(v) => update('nvmeTlcCapacity', v)} formatOption={(v) => `${v} TB`} />
          )}
        </div>

        <div className="space-y-0.5 mt-1">
          <p className="text-xs text-exp-gray-400 font-medium mt-1 mb-0.5">NVMe QLC</p>
          <Select label="Count" value={inputs.nvmeQlcCount} options={QLC_COUNTS} onChange={(v) => update('nvmeQlcCount', v)} />
          {inputs.nvmeQlcCount > 0 && (
            <Select label="Capacity" value={inputs.nvmeQlcCapacity} options={QLC_CAPACITIES} onChange={(v) => update('nvmeQlcCapacity', v)} formatOption={(v) => `${v} TB`} />
          )}
        </div>

        <div className="space-y-0.5 mt-1">
          <p className="text-xs text-exp-gray-400 font-medium mt-1 mb-0.5">HDD</p>
          <Select label="Count" value={inputs.hddCount} options={HDD_COUNTS} onChange={(v) => update('hddCount', v)} />
          {inputs.hddCount > 0 && (
            <Select label="Capacity" value={inputs.hddCapacity} options={HDD_CAPACITIES} onChange={(v) => update('hddCapacity', v)} formatOption={(v) => `${v} TB`} />
          )}
        </div>
      </div>

      {/* Data Efficiency */}
      <div className="pb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-exp-gray-400 mb-2">Data Efficiency</h3>

        <Select
          label="Compression"
          value={inputs.compressionSavings}
          options={COMPRESSION_OPTIONS}
          onChange={(v) => update('compressionSavings', v)}
          formatOption={(v) => `${Math.round(v * 100)}% savings`}
          tooltip="Estimated inline compression savings. Varies by workload — typically 10-25% for mixed workloads."
        />

        <div className="flex items-center justify-between py-2">
          <label className="text-sm font-medium text-exp-gray-600 flex items-center">
            Erasure Coding
            <Tooltip content="Erasure coding (EC) reduces the storage overhead of data protection by encoding cold data into data+parity strips instead of full replication. Only applies to cold/sequential data." />
          </label>
          <button
            onClick={() => update('erasureCoding', inputs.erasureCoding === 'Enabled' ? 'Disabled' : 'Enabled')}
            disabled={!ecAvailable}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              inputs.erasureCoding === 'Enabled' && ecAvailable ? 'bg-exp-red' : 'bg-exp-gray-300'
            } ${!ecAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
              inputs.erasureCoding === 'Enabled' && ecAvailable ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
        {!ecAvailable && (
          <p className="text-xs text-exp-gray-400 -mt-1 ml-1">
            EC requires {ecMinNodes}+ nodes for {inputs.replicationFactor}
          </p>
        )}

        {inputs.erasureCoding === 'Enabled' && ecAvailable && (
          <Select
            label="Cold Data %"
            value={inputs.coldDataPercent}
            options={COLD_DATA_OPTIONS}
            onChange={(v) => update('coldDataPercent', v)}
            formatOption={(v) => `${Math.round(v * 100)}%`}
            tooltip="Percentage of data eligible for erasure coding. EC is applied to cold/sequential data. Hot/random data remains replicated at the full RF. Higher values = more storage savings but only if the workload is truly cold."
          />
        )}
      </div>
    </div>
  );
}
