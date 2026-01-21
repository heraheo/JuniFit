type ValidationField = "weight" | "reps" | "time";

type ValidationResult = {
  error: string | null;
  numericValue: number | null;
};

export const numberFromInput = (value: string) => {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export const validateInput = (value: string, field: ValidationField): ValidationResult => {
  if (value.trim() === "") {
    return { error: null, numericValue: null };
  }

  const numericValue = numberFromInput(value);
  if (numericValue == null || numericValue <= 0) {
    if (field === "weight") return { error: "무게는 양수여야 합니다", numericValue };
    if (field === "reps") return { error: "횟수는 양의 정수여야 합니다", numericValue };
    if (field === "time") return { error: "시간은 양수여야 합니다", numericValue };
    return { error: "올바른 값을 입력해주세요", numericValue };
  }

  if (field === "reps" && !Number.isInteger(numericValue)) {
    return { error: "횟수는 정수여야 합니다", numericValue };
  }

  return { error: null, numericValue };
};

export const isNumericInput = (value: string) => /^\d*\.?\d*$/.test(value);
