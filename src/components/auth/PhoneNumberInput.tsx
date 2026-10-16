import { getCountryCallingCode, type CountryCode } from 'libphonenumber-js';
import { Input } from '@/components/ui/input';
import { PHONE_COUNTRY_OPTIONS } from '@/lib/phone';

interface PhoneNumberInputProps {
  country: CountryCode;
  onCountryChange: (country: CountryCode) => void;
  number: string;
  onNumberChange: (number: string) => void;
  disabled?: boolean;
}

const PhoneNumberInput = ({ country, onCountryChange, number, onNumberChange, disabled }: PhoneNumberInputProps) => (
  <div className="flex gap-2">
    {/* A native picker (scrolls well on phones), drawn as a compact "LK +94" button. */}
    <div className="relative shrink-0">
      <select
        aria-label="Country code"
        value={country}
        onChange={(e) => onCountryChange(e.target.value as CountryCode)}
        disabled={disabled}
        className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 dark:[color-scheme:dark]"
      >
        {PHONE_COUNTRY_OPTIONS.map((option) => (
          <option key={option.code} value={option.code}>
            {option.name} (+{option.dial})
          </option>
        ))}
      </select>
      <div
        aria-hidden
        className="flex h-10 items-center rounded-xl border border-input bg-background px-3 text-base md:text-sm text-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 ring-offset-background"
      >
        {country} +{getCountryCallingCode(country)}
      </div>
    </div>
    <Input
      type="tel"
      inputMode="tel"
      autoComplete="tel-national"
      placeholder="Mobile number"
      value={number}
      onChange={(e) => onNumberChange(e.target.value)}
      disabled={disabled}
      required
      className="rounded-xl"
    />
  </div>
);

export default PhoneNumberInput;
