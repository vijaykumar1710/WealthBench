"use client";

type Props = {
  age: string;
  setAge: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  occupation: string;
  setOccupation: (v: string) => void;
  yoe: string;
  setYoe: (v: string) => void;
  inputClass: string;
  labelClass: string;
};

export default function DemographicsSection({
  age,
  setAge,
  city,
  setCity,
  location,
  setLocation,
  occupation,
  setOccupation,
  yoe,
  setYoe,
  inputClass,
  labelClass,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className={labelClass}>Age *</label>
        <input
          type="number"
          inputMode="numeric"
          min={18}
          max={80}
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>City *</label>
        <input
          type="text"
          value={city}
          placeholder="Bengaluru, Mumbai..."
          onChange={(e) => setCity(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Location (optional)</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Years of experience *</label>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={60}
          value={yoe}
          onChange={(e) => setYoe(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="md:col-span-2">
        <label className={labelClass}>Occupation *</label>
        <input
          type="text"
          value={occupation}
          onChange={(e) => setOccupation(e.target.value)}
          placeholder="e.g. Software engineer"
          className={inputClass}
        />
      </div>
    </div>
  );
}
