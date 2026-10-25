"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  COUNTRY_CODES,
  CountryCode,
  findCountryByCode,
  validatePhoneForCountry,
  detectCountryFromPhone,
} from "@/lib/countryCodes";
import { Check, ChevronDown, Search, AlertCircle, CheckCircle2 } from "lucide-react";

interface PhoneInputProps {
  value: string;
  onChange: (nationalDigits: string, fullInternational: string, isValid: boolean) => void;
  country?: CountryCode;
  onCountryChange?: (country: CountryCode) => void;
  autoDetectIp?: boolean;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  label?: string;
  showFeedback?: boolean;
  className?: string;
}

export function PhoneInput({
  value,
  onChange,
  country,
  onCountryChange,
  autoDetectIp = true,
  required = false,
  disabled = false,
  id = "phone-input",
  placeholder,
  label,
  showFeedback = true,
  className = "",
}: PhoneInputProps) {
  const [internalCountry, setInternalCountry] = useState<CountryCode>(country || COUNTRY_CODES[0]);
  const activeCountry = country || internalCountry;

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTouched, setIsTouched] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 1. Auto-detect country code from client IP if enabled and not already provided
  useEffect(() => {
    if (!autoDetectIp) return;

    // If an existing number was passed with an international dial code, prioritize that
    if (value && value.startsWith("+")) {
      const detected = detectCountryFromPhone(value);
      if (detected.country) {
        setInternalCountry(detected.country);
        onCountryChange?.(detected.country);
        return;
      }
    }

    // Check cached country in sessionStorage
    try {
      const cached = sessionStorage.getItem("premikeys_geo_country");
      if (cached) {
        const found = findCountryByCode(cached);
        setInternalCountry(found);
        onCountryChange?.(found);
        return;
      }
    } catch {
      // ignore
    }

    // Fetch from /api/geo
    fetch("/api/geo")
      .then((res) => res.json())
      .then((data) => {
        if (data.countryCode) {
          try {
            sessionStorage.setItem("premikeys_geo_country", data.countryCode);
          } catch {
            // ignore
          }
          const matched = findCountryByCode(data.countryCode);
          setInternalCountry(matched);
          onCountryChange?.(matched);
        }
      })
      .catch(() => {});
  }, [autoDetectIp]);

  // Sync external country changes if controlled
  useEffect(() => {
    if (country) {
      setInternalCountry(country);
    }
  }, [country]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Validate current value against active country
  const validation = validatePhoneForCountry(activeCountry, value);

  const handleSelectCountry = (c: CountryCode) => {
    setInternalCountry(c);
    onCountryChange?.(c);
    setIsDropdownOpen(false);
    setSearchQuery("");

    // Re-evaluate current input with the new country code
    const reval = validatePhoneForCountry(c, value);
    onChange(reval.cleanNationalDigits, reval.fullInternationalNumber, reval.isValid);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow digits and spaces
    const cleanDigits = raw.replace(/\D/g, "");

    // Prevent typing wildly beyond max digits (allow max + 1 for leading 0)
    const maxAllowed = (activeCountry.maxLength || 11) + 1;
    if (cleanDigits.length > maxAllowed) {
      return;
    }

    const valRes = validatePhoneForCountry(activeCountry, cleanDigits);
    onChange(cleanDigits, valRes.fullInternationalNumber, valRes.isValid);
  };

  const filteredCountries = COUNTRY_CODES.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.dialCode.includes(searchQuery) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`space-y-1.5 text-left ${className}`} ref={dropdownRef}>
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>
            {label} {required && <span className="text-rose-400">*</span>}
          </span>
          <span className="text-[10px] text-cyan-400/80 font-normal">
            {activeCountry.name} ({activeCountry.dialCode})
          </span>
        </label>
      )}

      <div className="relative flex items-center gap-2">
        {/* Country Selector Trigger Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all border select-none ${
            isDropdownOpen
              ? "bg-cyan-500/15 border-cyan-400 text-white shadow-md shadow-cyan-500/20"
              : "bg-white/[0.04] border-white/10 hover:border-white/20 text-slate-200"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          aria-haspopup="listbox"
          aria-expanded={isDropdownOpen}
          title={`Country: ${activeCountry.name} (${activeCountry.dialCode})`}
        >
          <span className="text-base leading-none">{activeCountry.flag}</span>
          <span className="font-mono text-cyan-300 font-bold">{activeCountry.dialCode}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              isDropdownOpen ? "rotate-180 text-cyan-400" : ""
            }`}
          />
        </button>

        {/* National Number Input */}
        <div className="relative flex-1">
          <input
            id={id}
            type="tel"
            disabled={disabled}
            required={required}
            value={value}
            onChange={handleInputChange}
            onBlur={() => setIsTouched(true)}
            placeholder={placeholder || activeCountry.placeholder}
            className={`w-full glass-input px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-mono tracking-wider transition-all ${
              isTouched && value && !validation.isValid
                ? "border-rose-500/60 focus:border-rose-400 focus:ring-rose-500/20"
                : isTouched && value && validation.isValid
                ? "border-emerald-500/60 focus:border-emerald-400 focus:ring-emerald-500/20"
                : ""
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            autoComplete="tel-national"
          />

          {/* Validation Status Icon in Input */}
          {value && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {validation.isValid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : isTouched ? (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              ) : null}
            </div>
          )}
        </div>

        {/* Country Dropdown Panel */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 mt-1.5 w-72 max-h-72 bg-[#0a102b] border border-cyan-500/30 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col backdrop-blur-xl animate-fadeIn">
            {/* Search Input */}
            <div className="p-2.5 border-b border-white/10 bg-black/40">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search country or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full glass-input pl-8 pr-2.5 py-1.5 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Country Options List */}
            <div className="overflow-y-auto flex-1 divide-y divide-white/5 scrollbar-thin">
              {filteredCountries.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No country found
                </div>
              ) : (
                filteredCountries.map((c) => {
                  const isSelected = c.code === activeCountry.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleSelectCountry(c)}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-cyan-500/20 text-white font-bold"
                          : "hover:bg-white/[0.06] text-slate-300 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="text-base shrink-0">{c.flag}</span>
                        <span className="truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="font-mono text-cyan-400 text-[11px]">{c.dialCode}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-cyan-300" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Live Helper & Digit Counter Feedback */}
      {showFeedback && (
        <div className="flex items-center justify-between text-[11px] pt-0.5">
          {/* Validation Feedback Message */}
          {isTouched && value && !validation.isValid ? (
            <span className="text-rose-400 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{validation.error}</span>
            </span>
          ) : isTouched && value && validation.isValid ? (
            <span className="text-emerald-400 flex items-center gap-1 font-medium">
              <Check className="w-3 h-3 shrink-0" />
              <span>Valid format for {activeCountry.name}</span>
            </span>
          ) : (
            <span className="text-slate-400">
              {activeCountry.hint}
            </span>
          )}

          {/* Digit Counter Badge */}
          {value ? (
            <span
              className={`font-mono px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ml-2 ${
                validation.isValid
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  : "bg-white/5 text-slate-400 border border-white/10"
              }`}
            >
              {validation.digitsCount} / {activeCountry.exactLength || activeCountry.maxLength} digits
            </span>
          ) : (
            <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
              {validation.expectedLengthText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
