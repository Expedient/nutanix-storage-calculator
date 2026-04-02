import { useState, useMemo } from 'react';
import type { StorageInputs, CapacityUnit } from './types';
import { calculate } from './calculationEngine';
import InputPanel from './components/InputPanel';
import OutputPanel from './components/OutputPanel';
import Instructions from './components/Instructions';

const DEFAULT_INPUTS: StorageInputs = {
  workloadType: 'NCI',
  hosts: 6,
  nvmeTlcCount: 8,
  nvmeTlcCapacity: 7.68,
  nvmeQlcCount: 0,
  nvmeQlcCapacity: 61.44,
  hddCount: 0,
  hddCapacity: 24,
  replicationFactor: 'RF3',
  compressionSavings: 0.10,
  erasureCoding: 'Enabled',
  coldDataPercent: 0.20,
  capacityUnit: 'TiB',
};

export default function App() {
  const [inputs, setInputs] = useState<StorageInputs>(DEFAULT_INPUTS);
  const [unit, setUnit] = useState<CapacityUnit>('TiB');

  const outputs = useMemo(() => calculate(inputs), [inputs]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-exp-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={`${import.meta.env.BASE_URL}expedient-logo.svg`}
              alt="Expedient"
              className="h-7"
            />
            <span className="text-exp-gray-500 text-sm hidden sm:inline">|</span>
            <span className="text-sm text-exp-gray-400 hidden sm:inline">Nutanix Storage Calculator</span>
          </div>
          <span className="text-xs text-exp-gray-500">v1.0</span>
        </div>
      </header>

      {/* Disclaimer Banner */}
      <div className="bg-amber-50 border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <p className="text-xs text-amber-700 text-center">
            These numbers are close estimates only. For accurate calculations, use Nutanix Sizer or create a workload in a Scenario.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input Panel */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            <div className="bg-white rounded-xl border border-exp-gray-200 shadow-sm p-4 sticky top-6">
              <h2 className="text-base font-bold text-exp-black mb-3">Configuration</h2>
              <InputPanel
                inputs={inputs}
                onChange={setInputs}
                disksPerHost={outputs.disksPerHost}
              />
            </div>
          </div>

          {/* Output Panel */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            <Instructions />
            <OutputPanel outputs={outputs} unit={unit} onUnitChange={setUnit} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-exp-black text-exp-gray-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs">
            Built by Expedient &mdash; For use by Nutanix sizing professionals and NTC members.
          </p>
          <p className="text-xs">
            Not affiliated with Nutanix, Inc. Calculations are estimates only.
          </p>
        </div>
      </footer>
    </div>
  );
}
