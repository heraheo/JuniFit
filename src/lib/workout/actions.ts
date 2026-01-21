import type { ProgramWithExercises } from "@/lib/api";
import { validateInput } from "@/lib/workout/validation";

type SetInput = {
  weight: string;
  reps: string;
  time: string;
  completed: boolean;
};

type InputErrors = {
  [exerciseId: string]: {
    [setIndex: number]: {
      weight?: string;
      reps?: string;
      time?: string;
    };
  };
};

type UpdateInputArgs = {
  exerciseId: string;
  setIndex: number;
  field: keyof Omit<SetInput, "completed">;
  value: string;
  inputs: Record<string, SetInput[]>;
  setInputs: React.Dispatch<React.SetStateAction<Record<string, SetInput[]>>>;
  setErrors: React.Dispatch<React.SetStateAction<InputErrors>>;
};

type ToggleSetArgs = {
  exerciseId: string;
  setIndex: number;
  program: ProgramWithExercises | null;
  inputs: Record<string, SetInput[]>;
  setInputs: React.Dispatch<React.SetStateAction<Record<string, SetInput[]>>>;
  onSetComplete: (restSeconds: number) => void;
};

type SkipSetArgs = ToggleSetArgs;

type CompleteRemainingArgs = {
  program: ProgramWithExercises | null;
  currentIndex: number;
  setInputs: React.Dispatch<React.SetStateAction<Record<string, SetInput[]>>>;
};

type HasIncompleteArgs = {
  program: ProgramWithExercises | null;
  currentIndex: number;
  inputs: Record<string, SetInput[]>;
};

type CurrentValidArgs = {
  program: ProgramWithExercises | null;
  currentIndex: number;
  inputs: Record<string, SetInput[]>;
};

export const updateSetInput = ({
  exerciseId,
  setIndex,
  field,
  value,
  inputs,
  setInputs,
  setErrors,
}: UpdateInputArgs) => {
  const result = validateInput(value, field === "weight" || field === "reps" || field === "time" ? field : "reps");

  setInputs((prev) => {
    if (!prev[exerciseId]) return prev;

    return {
      ...prev,
      [exerciseId]: prev[exerciseId].map((set, idx) =>
        idx === setIndex ? { ...set, [field]: value } : set
      ),
    };
  });

  setErrors((prev) => ({
    ...prev,
    [exerciseId]: {
      ...prev[exerciseId],
      [setIndex]: {
        ...prev[exerciseId]?.[setIndex],
        [field]: result.error || undefined,
      },
    },
  }));
};

export const toggleSetCompletion = ({
  exerciseId,
  setIndex,
  program,
  inputs,
  setInputs,
  onSetComplete,
}: ToggleSetArgs) => {
  if (!program) return;

  const exercise = program.exercises.find((ex) => ex.id === exerciseId);
  if (!exercise) return;

  const currentSet = inputs[exerciseId]?.[setIndex];
  if (!currentSet) return;

  const recordType = exercise.record_type;
  const weight = currentSet.weight.trim();
  const reps = currentSet.reps.trim();
  const time = currentSet.time.trim();

  if (recordType === "weight_reps" && (weight === "" || reps === "")) {
    alert("무게와 횟수를 입력해주세요.");
    return;
  }
  if (recordType === "reps_only" && reps === "") {
    alert("횟수를 입력해주세요.");
    return;
  }
  if (recordType === "time" && time === "") {
    alert("시간을 입력해주세요.");
    return;
  }

  const weightNum = Number(weight);
  const repsNum = Number(reps);
  const timeNum = Number(time);

  if (recordType === "weight_reps" && (Number.isNaN(weightNum) || weightNum <= 0 || Number.isNaN(repsNum) || repsNum <= 0)) {
    alert("올바른 값을 입력해주세요.");
    return;
  }
  if (recordType === "reps_only" && (Number.isNaN(repsNum) || repsNum <= 0)) {
    alert("올바른 횟수를 입력해주세요.");
    return;
  }
  if (recordType === "time" && (Number.isNaN(timeNum) || timeNum <= 0)) {
    alert("올바른 시간을 입력해주세요.");
    return;
  }

  const newCompletedState = !currentSet.completed;

  setInputs((prev) => ({
    ...prev,
    [exerciseId]: prev[exerciseId].map((set, idx) =>
      idx === setIndex ? { ...set, completed: newCompletedState } : set
    ),
  }));

  if (newCompletedState && exercise.rest_seconds) {
    onSetComplete(exercise.rest_seconds);
  }
};

export const skipSet = ({
  exerciseId,
  setIndex,
  program,
  inputs,
  setInputs,
  onSetComplete,
}: SkipSetArgs) => {
  if (!program) return;

  const exercise = program.exercises.find((ex) => ex.id === exerciseId);
  if (!exercise) return;

  const currentSet = inputs[exerciseId]?.[setIndex];
  if (!currentSet) return;

  const recordType = exercise.record_type;
  let weight = null;
  let reps = null;
  let time = null;

  if (recordType === "weight_reps") {
    weight = 0;
    reps = 0;
  } else if (recordType === "reps_only") {
    reps = 0;
  } else if (recordType === "time") {
    time = 0;
  }

  setInputs((prev) => ({
    ...prev,
    [exerciseId]: prev[exerciseId].map((set, idx) =>
      idx === setIndex
        ? {
            ...set,
            completed: true,
            weight: String(weight ?? ""),
            reps: String(reps ?? ""),
            time: String(time ?? ""),
          }
        : set
    ),
  }));

  const isLastSet = setIndex === (exercise.target_sets || 1) - 1;
  if (!isLastSet && exercise.rest_seconds) {
    onSetComplete(exercise.rest_seconds);
  }
};

export const completeRemainingSets = ({
  program,
  currentIndex,
  setInputs,
}: CompleteRemainingArgs) => {
  if (!program) return;
  const currentExercise = program.exercises[currentIndex];
  if (!currentExercise) return;

  setInputs((prev) => ({
    ...prev,
    [currentExercise.id]: prev[currentExercise.id].map((set) =>
      set.completed
        ? set
        : {
            weight: "0",
            reps: "0",
            time: "0",
            completed: true,
          }
    ),
  }));
};

export const hasIncompleteSets = ({
  program,
  currentIndex,
  inputs,
}: HasIncompleteArgs) => {
  if (!program) return false;
  const currentExercise = program.exercises[currentIndex];
  if (!currentExercise) return false;

  const exerciseInputs = inputs[currentExercise.id] || [];
  return exerciseInputs.some((set) => !set.completed);
};

export const isCurrentValid = ({
  program,
  currentIndex,
  inputs,
}: CurrentValidArgs) => {
  if (!program) return false;
  const exercise = program.exercises[currentIndex];
  if (!exercise) return false;

  const exerciseInputs = inputs[exercise.id] || [];
  return exerciseInputs.some((set) => set.completed);
};
