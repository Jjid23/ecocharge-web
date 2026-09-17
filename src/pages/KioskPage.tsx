import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu, Wifi, WifiOff, Zap, Activity, Trash2,
  ToggleLeft, ToggleRight, RefreshCw, AlertTriangle,
  Thermometer, Gauge, BatteryCharging, CheckCircle2,
  Radio, ChevronRight
} from 'lucide-react';
import { fetchDeviceStatus, fetchDeviceHistory, setRelayCommand } from '../services/api';

// ── Types ──────────────────────────────────────────────────────────────────────
interface PortPower {
  port: number;
  voltageV: number | null;
  currentA: number | null;
  powerW:   number | null;
  relay:    boolean;
}

interface DeviceStatus {
  deviceName:              string;
  serialNumber:            string;
  onlineStatus:            'Online' | 'Stale' | 'Offline';
  lastHeartbeat:           string;
  recordedAt:              string;
  entranceDistanceCm:      number | null;
  binTopDistanceCm:        number | null;
  binBottomDistanceCm:     number | null;
  binFillPercentage:       number;
  bottleDetectedAtEntrance: boolean;
  ports:                   PortPower[];
  conveyorRunning:         boolean;
  conveyorSpeedPwm:        number;
}

// ── Helper: status badge ──────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = {
    Online:  { cls: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300', dot: 'bg-emerald-400 animate-ping' },
    Stale:   { cls: 'bg-amber-500/20 border-amber-500/50 text-amber-300',       dot: 'bg-amber-400' },
    Offline: { cls: 'bg-rose-500/20 border-rose-500/50 text-rose-300',          dot: 'bg-rose-400' },
  }[status] ?? { cls: 'bg-gray-500/20 border-gray-500/50 text-gray-300', dot: 'bg-gray-400' };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase ${cfg.cls}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
export const KioskPage: React.FC = () => {
  const [status,     setStatus]     = useState<DeviceStatus | null>(null);
  const [history,    setHistory]    = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [relayBusy,  setRelayBusy]  = useState<number | null>(null);
  const [toast,      setToast]      = useState<string | null>(null);
  const [noData,     setNoData]     = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([
        fetchDeviceStatus(),
        fetchDeviceHistory(30),
      ]);
      if (s?.message) { setNoData(true); }
      else            { setStatus(s); setNoData(false); }
      setHistory(h?.readings ?? []);
    } catch {
      setNoData(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 3000); // poll every 3s
    return () => clearInterval(iv);
  }, [load]);

  const handleRelay = async (port: number, activate: boolean) => {
    setRelayBusy(port);
    try {
      await setRelayCommand(port, activate, 0);
      showToast(`Port ${port} relay ${activate ? 'activated' : 'deactivated'} — command queued.`);
      setTimeout(load, 2500);
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    } finally {
      setRelayBusy(null);
    }
  };

  // ── Bin fill bar colour ────────────────────────────────────────────────────
  const fillColour = (pct: number) =>
    pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-400';

  // ── Loading / no data states ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center gap-3 text-emerald-400">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm font-bold">Loading kiosk telemetry…</span>
      </div>
    );
  }

  if (noData || !status) {
    return (
      <div className="px-4 py-8 space-y-4 text-center">
        <WifiOff className="w-14 h-14 text-rose-400 mx-auto" />
        <div className="text-base font-black text-white">ESP32-A Not Connected</div>
        <div className="text-xs text-emerald-300/80 max-w-xs mx-auto">
          No telemetry received yet. Make sure the ESP32-A is powered,
          connected to Wi-Fi, and pointing at{' '}
          <code className="text-amber-300">http://[server-ip]:5225</code>.
        </div>
        <div className="bg-[#021f14] border border-emerald-800/60 rounded-2xl p-4 text-left text-xs space-y-1.5 max-w-xs mx-auto">
          <div className="font-bold text-emerald-300 mb-2">Quick setup checklist</div>
          {[
            'Flash firmware to ESP32-A (COM3)',
            'Set WIFI_SSID + WIFI_PASSWORD in firmware',
            'Set SERVER_IP to your machine\'s LAN IP',
            'Set DEVICE_SECRET to ECOCHARGE_ESP32_SHARED_SECRET_2025',
            'Power on ESP32-A — it will auto-register',
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-emerald-200/80">
              <ChevronRight className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
              <span>{s}</span>
            </div>
          ))}
        </div>
        <button onClick={load} className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-sm font-bold flex items-center gap-2 mx-auto active:scale-95 transition-transform">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const secondsAgo = Math.round(
    (Date.now() - new Date(status.lastHeartbeat).getTime()) / 1000
  );

  return (
    <div className="px-4 py-5 space-y-5">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-4 right-4 z-50 bg-emerald-900 border border-emerald-500/60 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl text-center">
          {toast}
        </div>
      )}

      {/* ── Device header ─────────────────────────────────────────────── */}
      <div className="bg-[#021f14] border border-emerald-800/60 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-900 border border-emerald-700 flex items-center justify-center shrink-0">
          <Cpu className="w-6 h-6 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-black text-white truncate">{status.deviceName}</div>
          <div className="text-[10px] text-emerald-400 font-mono">{status.serialNumber}</div>
          <div className="text-[10px] text-emerald-400/70 mt-0.5">
            Last seen {secondsAgo}s ago
          </div>
        </div>
        <StatusBadge status={status.onlineStatus} />
      </div>

      {/* ── Bottle entrance sensor ─────────────────────────────────────── */}
      <div className={`rounded-2xl border p-4 flex items-center gap-3 transition-all ${
        status.bottleDetectedAtEntrance
          ? 'bg-amber-900/40 border-amber-500/60'
          : 'bg-[#021f14] border-emerald-800/60'
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          status.bottleDetectedAtEntrance ? 'bg-amber-500/20' : 'bg-emerald-900/60'
        }`}>
          <Radio className={`w-5 h-5 ${status.bottleDetectedAtEntrance ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`} />
        </div>
        <div className="flex-1">
          <div className="text-xs font-bold text-white">Bottle Entrance Sensor</div>
          <div className={`text-[11px] font-semibold ${status.bottleDetectedAtEntrance ? 'text-amber-300' : 'text-emerald-400/70'}`}>
            {status.bottleDetectedAtEntrance ? '🍾 Bottle Detected!' : 'No object at entrance'}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] text-emerald-400">Distance</div>
          <div className="text-sm font-black text-white">
            {status.entranceDistanceCm != null ? `${status.entranceDistanceCm.toFixed(1)} cm` : '—'}
          </div>
        </div>
      </div>

      {/* ── Bin fill level ────────────────────────────────────────────── */}
      <div className="bg-[#021f14] border border-emerald-800/60 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Bin Fill Level</span>
          </div>
          <span className={`text-lg font-black ${
            status.binFillPercentage >= 90 ? 'text-rose-400' :
            status.binFillPercentage >= 70 ? 'text-amber-400' : 'text-emerald-400'
          }`}>{status.binFillPercentage}%</span>
        </div>
        <div className="h-3 bg-emerald-950 rounded-full overflow-hidden border border-emerald-800/60">
          <div
            className={`h-full rounded-full transition-all duration-500 ${fillColour(status.binFillPercentage)}`}
            style={{ width: `${status.binFillPercentage}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          {[
            { label: 'Top Sensor',    val: status.binTopDistanceCm },
            { label: 'Bottom Sensor', val: status.binBottomDistanceCm },
            { label: 'Entrance',      val: status.entranceDistanceCm },
          ].map(({ label, val }) => (
            <div key={label} className="bg-emerald-950/60 rounded-xl p-2 text-center border border-emerald-900">
              <div className="text-emerald-400/70 mb-0.5">{label}</div>
              <div className="font-bold text-white">{val != null ? `${val.toFixed(1)} cm` : '—'}</div>
            </div>
          ))}
        </div>
        {status.binFillPercentage >= 90 && (
          <div className="flex items-center gap-2 bg-rose-950/60 border border-rose-500/40 rounded-xl p-2.5 text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            Bin is almost full — please empty soon!
          </div>
        )}
      </div>

      {/* ── Relay / Port control ──────────────────────────────────────── */}
      <div className="bg-[#021f14] border border-emerald-800/60 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Charging Port Relays</span>
          <span className="text-[10px] text-emerald-400/60 ml-1">(active LOW)</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(status.ports ?? []).map((p) => {
            const powerW = p.powerW ?? (p.voltageV && p.currentA ? p.voltageV * p.currentA : null);
            return (
              <div
                key={p.port}
                className={`rounded-xl border p-3 space-y-2 transition-all ${
                  p.relay
                    ? 'bg-amber-900/30 border-amber-500/50'
                    : 'bg-emerald-950/60 border-emerald-800/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Port {p.port}</div>
                    <div className={`text-[10px] font-semibold ${p.relay ? 'text-amber-300' : 'text-emerald-400/60'}`}>
                      {p.relay ? 'Active' : 'Idle'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRelay(p.port, !p.relay)}
                    disabled={relayBusy !== null}
                    className={`w-10 h-6 rounded-full border transition-all flex items-center px-0.5 ${
                      p.relay
                        ? 'bg-amber-500 border-amber-400 justify-end'
                        : 'bg-emerald-900 border-emerald-700 justify-start'
                    } disabled:opacity-40`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[9px]">
                  <div className="text-center">
                    <div className="text-emerald-400/60">V</div>
                    <div className="font-bold text-white">{p.voltageV?.toFixed(1) ?? '—'}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-emerald-400/60">A</div>
                    <div className="font-bold text-white">{p.currentA?.toFixed(2) ?? '—'}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-emerald-400/60">W</div>
                    <div className={`font-bold ${powerW ? 'text-amber-300' : 'text-white'}`}>
                      {powerW?.toFixed(1) ?? '—'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Conveyor motor ────────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-4 flex items-center gap-3 ${
        status.conveyorRunning
          ? 'bg-teal-900/30 border-teal-500/50'
          : 'bg-[#021f14] border-emerald-800/60'
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          status.conveyorRunning ? 'bg-teal-500/20' : 'bg-emerald-900/60'
        }`}>
          <Activity className={`w-5 h-5 ${status.conveyorRunning ? 'text-teal-400 animate-spin' : 'text-emerald-400/60'}`} />
        </div>
        <div className="flex-1">
          <div className="text-xs font-bold text-white">Conveyor Motor (L298N)</div>
          <div className={`text-[11px] ${status.conveyorRunning ? 'text-teal-300' : 'text-emerald-400/60'}`}>
            {status.conveyorRunning ? 'Running' : 'Stopped'}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] text-emerald-400">PWM Speed</div>
          <div className="text-sm font-black text-white">{status.conveyorSpeedPwm}/255</div>
        </div>
      </div>

      {/* ── Recent telemetry mini-chart (last 30 readings) ────────────── */}
      {history.length > 0 && (
        <div className="bg-[#021f14] border border-emerald-800/60 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-teal-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Bin Fill History</span>
            <span className="text-[10px] text-emerald-400/60">(last {history.length} readings)</span>
          </div>
          {/* Simple bar chart */}
          <div className="flex items-end gap-0.5 h-16">
            {history.map((r, i) => (
              <div
                key={i}
                className={`flex-1 rounded-sm ${fillColour(r.binFillPercentage)} opacity-80`}
                style={{ height: `${Math.max(4, r.binFillPercentage)}%` }}
                title={`${r.binFillPercentage}% @ ${new Date(r.recordedAt).toLocaleTimeString()}`}
              />
            ))}
          </div>
          {/* Power usage bar chart */}
          <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mt-2">Total Power (W)</div>
          <div className="flex items-end gap-0.5 h-12">
            {history.map((r, i) => {
              const total = (r.sw1W ?? 0) + (r.sw2W ?? 0) + (r.sw3W ?? 0) + (r.sw4W ?? 0);
              const max   = 300; // max watts across 4 ports
              return (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-amber-400 opacity-70"
                  style={{ height: `${Math.max(2, (total / max) * 100)}%` }}
                  title={`${total.toFixed(0)}W @ ${new Date(r.recordedAt).toLocaleTimeString()}`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── Raw last reading timestamp ─────────────────────────────────── */}
      <div className="text-center text-[10px] text-emerald-400/50 pb-2">
        Last reading: {new Date(status.recordedAt).toLocaleString()}
        <span className="mx-1.5">·</span>
        Auto-refresh every 3s
      </div>
    </div>
  );
};
