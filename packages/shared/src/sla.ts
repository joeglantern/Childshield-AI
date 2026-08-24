import type { Severity } from './constants.js';

/// Minutes until a not-yet-triaged case emits sla.warning, per severity tier.
/// Cases with no severity yet use the DEFAULT tier.
export interface SlaTierConfig {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  CRITICAL: number;
  DEFAULT: number;
}

export function slaMinutesFor(config: SlaTierConfig, severity: Severity | null): number {
  return severity === null ? config.DEFAULT : config[severity];
}
