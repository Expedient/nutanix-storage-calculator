import { useState } from 'react';

export default function Instructions() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-exp-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-exp-gray-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-exp-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-semibold text-exp-gray-600">Quick Reference</span>
        </div>
        <svg className={`w-4 h-4 text-exp-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-exp-gray-100">
          <div className="mt-3 space-y-4 text-xs text-exp-gray-600 leading-relaxed">

            <Section title="Cluster Minimums">
              <li><strong>RF2 (FT1)</strong> requires a minimum of <strong>3 nodes</strong></li>
              <li><strong>RF3 (FT2)</strong> requires a minimum of <strong>5 nodes</strong></li>
              <li><strong>RF2.5 (FT1n:2d)</strong> requires <strong>5+ nodes</strong>, <strong>20+ disks per node</strong>, and a <strong>NUS-only</strong> workload (Files or Objects)</li>
              <li>Erasure coding requires <strong>4+ nodes</strong> for RF2, <strong>6+ nodes</strong> for RF3 on NCI, or <strong>5+ nodes</strong> for RF3 on NUS</li>
            </Section>

            <Section title="Disk Configuration">
              <li>Select a maximum of <strong>2 disk tiers</strong> (e.g., TLC + QLC, or TLC + HDD)</li>
              <li><strong>NST (TLC + QLC NVMe)</strong> is only available on NX-series nodes at this time</li>
              <li>HDD-only configurations are not supported &mdash; NVMe is always required for the hot tier</li>
              <li>Set the count to 0 for any tier you are not using</li>
            </Section>

            <Section title="Replication Factor">
              <li><strong>RF2</strong> &mdash; 2 copies of data (FT1). Tolerates 1 node failure. Best capacity efficiency.</li>
              <li><strong>RF3</strong> &mdash; 3 copies of data (FT2). Tolerates 2 simultaneous failures. Required for mission-critical workloads.</li>
              <li><strong>RF2.5</strong> &mdash; FT1n:2d. Tolerates 1 node failure + 2 disk failures. NUS only. Enables wider EC strips for significantly better capacity efficiency than RF3.</li>
            </Section>

            <Section title="Erasure Coding">
              <li>EC replaces full replication for <strong>cold/sequential data</strong> with space-efficient data+parity strips</li>
              <li>The &ldquo;Cold Data %&rdquo; slider controls what fraction of your data is EC-eligible. Hot/random data always remains at the full replication factor.</li>
              <li>Wider EC strips (more data blocks per parity block) = lower overhead but require more nodes</li>
              <li>NUS workloads with 20+ disks/host unlock wider strip sizes (up to 12/2)</li>
            </Section>

            <Section title="Capacity Tiers">
              <li><strong>Logical Capacity</strong> &mdash; Effective raw divided by data expansion (replication/EC + compression)</li>
              <li><strong>Logical Usable</strong> &mdash; Logical minus 6% CVM overhead and 5% rebuild reserve (= 89% of logical)</li>
              <li><strong>Operational / Sellable</strong> &mdash; 80% of logical usable. The capacity available for customer workloads.</li>
            </Section>

          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-semibold text-exp-black mb-1.5">{title}</h4>
      <ul className="space-y-1 list-disc list-outside ml-4">
        {children}
      </ul>
    </div>
  );
}
