// ─── Known Scale BLE UUIDs ────────────────────────────────────────────────────
// QN-Scale / Renpho older models (ES-CS20M etc.)
const QN_SERVICE_UUID = '0000ffb0-0000-1000-8000-00805f9b34fb';
const QN_CHAR_UUID    = '0000ffb2-0000-1000-8000-00805f9b34fb';

// BT SIG Weight Scale Service (Renpho ES-RLS81 / Elis 1 and newer models)
const BTSIG_SERVICE_UUID = '0000181d-0000-1000-8000-00805f9b34fb';
const BTSIG_CHAR_UUID    = '00002a9d-0000-1000-8000-00805f9b34fb';

// Scan for both simultaneously
const ALL_SERVICE_UUIDS = [QN_SERVICE_UUID, BTSIG_SERVICE_UUID];

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

// ─── Weight Parsers ───────────────────────────────────────────────────────────

/** QN-Scale / Renpho older protocol: (Byte3 * 256 + Byte4) / 100 → kg */
export function parseWeightKg(bytes: number[]): number {
  return (bytes[3] * 256 + bytes[4]) / 100;
}

/**
 * BT SIG Weight Measurement (0x2A9D) parser.
 * Byte 0: flags (bit 0 = 0 → SI/kg, 1 → Imperial/lbs)
 * Bytes 1-2: uint16 LE weight value
 * SI: value * 0.005 = kg; Imperial: value * 0.01 lbs → kg
 */
function parseWeightKgBTSIG(bytes: number[]): number {
  const flags = bytes[0];
  const isSI = (flags & 0x01) === 0;
  const rawValue = bytes[1] | (bytes[2] << 8);
  return isSI ? rawValue * 0.005 : (rawValue * 0.01) / 2.20462;
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

  ble.startDeviceScan(ALL_SERVICE_UUIDS, null, async (error: any, device: any) => {
    if (error) {
      callbacks.onError(error.message);
      callbacks.onStatus('error');
      return;
    }
    if (!device) return;

    ble.stopDeviceScan();
    callbacks.onStatus('connecting');

    // Determine which protocol to use based on advertised services
    const services: string[] = device.serviceUUIDs ?? [];
    const isBTSIG = services.some((s: string) => s.toLowerCase().includes('181d'));
    const serviceUUID = isBTSIG ? BTSIG_SERVICE_UUID : QN_SERVICE_UUID;
    const charUUID    = isBTSIG ? BTSIG_CHAR_UUID    : QN_CHAR_UUID;
    const parser      = isBTSIG ? parseWeightKgBTSIG : parseWeightKg;

    console.log(`[BLE] Device: ${device.name ?? 'unnamed'} | Protocol: ${isBTSIG ? 'BT-SIG' : 'QN-Scale'}`);

    try {
      activeDevice = await device.connect();
      await activeDevice.discoverAllServicesAndCharacteristics();

      callbacks.onStatus('receiving');

      subscription = activeDevice.monitorCharacteristicForService(
        serviceUUID,
        charUUID,
        (err: any, char: any) => {
          if (err || !char?.value) return;

          const bytes = base64ToBytes(char.value);
          if (bytes.length < 3) return;

          const weightKg = parser(bytes);
          if (weightKg <= 0 || weightKg > 300) return;

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

/**
 * Debug scan — logs ALL nearby BLE devices and their service UUIDs.
 * Useful for discovering the correct UUIDs for an unrecognised scale.
 * Dev-only: call from a debug button in the UI.
 */
export async function scanAllDevices(): Promise<void> {
  loadBLE();
  if (!BleManagerClass) {
    console.log('[BLE Debug] BLE not available on this platform');
    return;
  }
  const ble = getManager();
  console.log('[BLE Debug] Starting promiscuous scan for 10 seconds…');

  ble.startDeviceScan(null, null, (error: any, device: any) => {
    if (error) {
      console.error('[BLE Debug] Scan error:', error.message);
      return;
    }
    if (device) {
      console.log(
        `[BLE Debug] ${device.name ?? '(unnamed)'} | id: ${device.id} | rssi: ${device.rssi}`
      );
      if (device.serviceUUIDs?.length) {
        console.log(`  Services: ${device.serviceUUIDs.join(', ')}`);
      }
    }
  });

  setTimeout(() => {
    ble.stopDeviceScan();
    console.log('[BLE Debug] Scan complete — check Expo logs for device UUIDs.');
  }, 10000);
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
