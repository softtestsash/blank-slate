// ─── Renpho / QN-Scale BLE UUIDs ─────────────────────────────────────────────

const SERVICE_UUID = '0000ffb0-0000-1000-8000-00805f9b34fb';
const CHAR_UUID    = '0000ffb2-0000-1000-8000-00805f9b34fb';

// ─── Lazy BLE load ────────────────────────────────────────────────────────────
// react-native-ble-plx is a native module — not available in Expo Go or on web.
// Deferred to call-time (not module-init-time) to avoid TurboModule timing
// issues in React Native 0.76 New Architecture (PlatformConstants race).

let BleManagerClass: (new () => any) | null = null;
let _bleLoaded = false;

function loadBLE(): void {
  if (_bleLoaded) return;
  _bleLoaded = true;
  try {
    BleManagerClass = require('react-native-ble-plx').BleManager;
    console.log('[BLE] native module available: true');
  } catch {
    // Running in Expo Go or web — MOCK_MODE will be forced on below.
    console.log('[BLE] native module available: false (Expo Go / web)');
  }
}

// ─── Mock Mode ────────────────────────────────────────────────────────────────
// Auto-enabled when BLE is unavailable (Expo Go / web) OR when __DEV__ is true.

export let MOCK_MODE = __DEV__;

export function setMockMode(enabled: boolean): void {
  MOCK_MODE = enabled;
}

// ─── Weight Parser ────────────────────────────────────────────────────────────

/**
 * Parse Renpho/QN-Scale BLE notification bytes into weight (kg).
 * Formula: (Byte3 * 256 + Byte4) / 100
 */
export function parseWeightKg(bytes: number[]): number {
  return (bytes[3] * 256 + bytes[4]) / 100;
}

function base64ToBytes(b64: string): number[] {
  const binary = atob(b64);
  return Array.from(binary).map(c => c.charCodeAt(0));
}

// ─── BLE Manager (singleton) ─────────────────────────────────────────────────

let manager: any | null = null;
let activeDevice: any | null = null;
let subscription: { remove: () => void } | null = null;

function getManager(): any {
  if (!manager) {
    loadBLE();
    if (!BleManagerClass) throw new Error('BLE not available on this platform');
    manager = new BleManagerClass();
  }
  return manager;
}

// ─── Stable Reading Detection ─────────────────────────────────────────────────

// Two consecutive identical values within 500 ms = stable.
let lastValue: number | null = null;
let lastValueTime: number = 0;
const STABLE_WINDOW_MS = 500;

function checkStable(weight: number): boolean {
  const now = Date.now();
  if (lastValue !== null &&
      Math.abs(lastValue - weight) < 0.005 &&
      now - lastValueTime < STABLE_WINDOW_MS) {
    return true;
  }
  lastValue = weight;
  lastValueTime = now;
  return false;
}

function resetStable(): void {
  lastValue = null;
  lastValueTime = 0;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type ScanStatus = 'scanning' | 'connecting' | 'receiving' | 'stable' | 'error';

export interface BLECallbacks {
  onStatus: (status: ScanStatus) => void;
  onWeightStable: (weightKg: number) => void;
  onError: (error: string) => void;
}

/**
 * Start scanning for a compatible scale.
 * Calls onWeightStable(kg) when a stable reading is detected.
 */
export async function startScan(callbacks: BLECallbacks): Promise<void> {
  resetStable();
  loadBLE();

  // MOCK_MODE is always true in __DEV__; also force it if BLE native module
  // wasn't found (Expo Go / web).
  const effectiveMock = MOCK_MODE || BleManagerClass === null;

  if (effectiveMock) {
    callbacks.onStatus('scanning');
    // Simulate a 2-second scan then return a mock weight
    setTimeout(() => {
      callbacks.onStatus('receiving');
      const mockKg = 72.5 + (Math.random() - 0.5) * 0.1;
      callbacks.onStatus('stable');
      callbacks.onWeightStable(mockKg);
    }, 2000);
    return;
  }

  const { Platform } = require('react-native');
  if (Platform.OS === 'android') {
    // Android 12+ needs BLUETOOTH_SCAN & BLUETOOTH_CONNECT at runtime.
    // Permissions are requested via app.json plugin config.
  }

  const ble = getManager();
  callbacks.onStatus('scanning');

  ble.startDeviceScan([SERVICE_UUID], null, async (error: any, device: any) => {
    if (error) {
      callbacks.onError(error.message);
      callbacks.onStatus('error');
      return;
    }
    if (!device) return;

    ble.stopDeviceScan();
    callbacks.onStatus('connecting');

    try {
      activeDevice = await device.connect();
      await activeDevice.discoverAllServicesAndCharacteristics();

      callbacks.onStatus('receiving');

      subscription = activeDevice.monitorCharacteristicForService(
        SERVICE_UUID,
        CHAR_UUID,
        (err: any, char: any) => {
          if (err || !char?.value) return;

          const bytes = base64ToBytes(char.value);
          if (bytes.length < 5) return;

          const weightKg = parseWeightKg(bytes);
          if (weightKg <= 0) return;

          if (checkStable(weightKg)) {
            callbacks.onStatus('stable');
            callbacks.onWeightStable(weightKg);
            stopScan();
          }
        }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      callbacks.onError(msg);
      callbacks.onStatus('error');
    }
  });
}

export function stopScan(): void {
  if (manager) {
    manager.stopDeviceScan();
  }
  subscription?.remove();
  subscription = null;
  activeDevice?.cancelConnection().catch(() => {});
  activeDevice = null;
  resetStable();
}

export function destroyBLE(): void {
  stopScan();
  manager?.destroy();
  manager = null;
}
