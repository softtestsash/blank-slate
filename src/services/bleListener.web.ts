// Web-only BLE stub — Metro picks this file instead of bleListener.ts when
// bundling for web. No native BLE available in the browser; all functions
// run in mock mode automatically.

export let MOCK_MODE = true;

export function setMockMode(_enabled: boolean): void {
  // No-op on web — always mock
}

export function parseWeightKg(bytes: number[]): number {
  return (bytes[3] * 256 + bytes[4]) / 100;
}

export type ScanStatus = 'scanning' | 'connecting' | 'receiving' | 'stable' | 'error';

export interface BLECallbacks {
  onStatus: (status: ScanStatus) => void;
  onWeightStable: (weightKg: number) => void;
  onError: (error: string) => void;
}

export async function startScan(callbacks: BLECallbacks): Promise<void> {
  callbacks.onStatus('scanning');
  setTimeout(() => {
    callbacks.onStatus('receiving');
    const mockKg = 72.5 + (Math.random() - 0.5) * 0.2;
    callbacks.onStatus('stable');
    callbacks.onWeightStable(mockKg);
  }, 2000);
}

export function stopScan(): void {}

export function destroyBLE(): void {}

export async function scanAllDevices(): Promise<void> {
  console.log('[BLE Web] scanAllDevices — not available in browser');
}
