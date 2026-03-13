'use client';

/**
 * Structured address form: line 1, line 2, postcode, state/province, country (dropdown).
 * Use wherever an address is collected. Country uses shared COUNTRIES list.
 */
import type { Address } from '@/lib/address';
import { COUNTRIES } from '@/lib/address';

const inputClass = 'mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground';

interface AddressFormProps {
  value: Address;
  onChange: (address: Address) => void;
  /** Optional label prefix e.g. "Organisation address" */
  labelPrefix?: string;
  /** Optional: hide labels and use placeholders only */
  compact?: boolean;
}

export function AddressForm({ value, onChange, labelPrefix = '', compact }: AddressFormProps) {
  const update = (key: keyof Address, v: string) => {
    onChange({ ...value, [key]: v });
  };
  const lbl = (s: string) => (labelPrefix ? `${labelPrefix} – ${s}` : s);
  return (
    <div className="space-y-3">
      <label className="block">
        <span className={compact ? 'sr-only' : 'text-sm font-medium text-muted-foreground'}>{lbl('Line 1')}</span>
        <input
          type="text"
          value={value.line1}
          onChange={(e) => update('line1', e.target.value)}
          className={inputClass}
          placeholder="Address line 1"
        />
      </label>
      <label className="block">
        <span className={compact ? 'sr-only' : 'text-sm font-medium text-muted-foreground'}>{lbl('Line 2')}</span>
        <input
          type="text"
          value={value.line2}
          onChange={(e) => update('line2', e.target.value)}
          className={inputClass}
          placeholder="Address line 2 (optional)"
        />
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className={compact ? 'sr-only' : 'text-sm font-medium text-muted-foreground'}>{lbl('Postcode')}</span>
          <input
            type="text"
            value={value.postcode}
            onChange={(e) => update('postcode', e.target.value)}
            className={inputClass}
            placeholder="Postcode / ZIP"
          />
        </label>
        <label className="block">
          <span className={compact ? 'sr-only' : 'text-sm font-medium text-muted-foreground'}>{lbl('State / Province')}</span>
          <input
            type="text"
            value={value.stateProvince}
            onChange={(e) => update('stateProvince', e.target.value)}
            className={inputClass}
            placeholder="State / Province"
          />
        </label>
      </div>
      <label className="block">
        <span className={compact ? 'sr-only' : 'text-sm font-medium text-muted-foreground'}>{lbl('Country')}</span>
        <select
          value={value.country}
          onChange={(e) => update('country', e.target.value)}
          className={inputClass}
        >
          {COUNTRIES.map((c) => (
            <option key={c || 'blank'} value={c}>{c || 'Select country'}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
