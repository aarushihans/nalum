import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BatchYearSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  mode: "alumni" | "student";
  placeholder?: string;
  id?: string;
}

// alumni: 2026 → 1981 (already graduated)
// student: 2027 → 2030 (yet to graduate)
const ALUMNI_YEARS = Array.from({ length: 46 }, (_, i) => 2026 - i);
const STUDENT_YEARS = [2027, 2028, 2029, 2030];

const BatchYearSelect = ({
  value,
  onValueChange,
  mode,
  placeholder = "Select passing year",
  id,
}: BatchYearSelectProps) => {
  const years = mode === "alumni" ? ALUMNI_YEARS : STUDENT_YEARS;

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {years.map((year) => (
          <SelectItem key={year} value={year.toString()}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default BatchYearSelect;
