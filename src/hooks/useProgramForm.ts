import { useState, useCallback } from "react";
import {
  validateNumericInput,
  validateProgramForm,
  type ProgramExerciseForm,
} from "@/lib/validation";

interface ProgramFormState {
  title: string;
  description: string;
  rpe: string;
  exercises: ProgramExerciseForm[];
}

interface ProgramFormValidation {
  errors: {
    title?: string;
    description?: string;
    exercises?: Record<string, { summary?: string }>;
  };
  inputErrors: Record<string, string>;
}

interface UseProgramFormOptions {
  initialTitle?: string;
  initialDescription?: string;
  initialRpe?: string;
  initialExercises?: ProgramExerciseForm[];
}

export type { ProgramExerciseForm };

export function useProgramForm(options: UseProgramFormOptions = {}) {
  const [formState, setFormState] = useState<ProgramFormState>({
    title: options.initialTitle || "",
    description: options.initialDescription || "",
    rpe: options.initialRpe || "",
    exercises: options.initialExercises || [
      {
        id: String(Date.now()),
        exerciseId: "",
        exerciseName: "",
        recordType: "",
        targetPart: "",
        targetSets: "",
        restSeconds: "",
        targetWeight: "",
        targetReps: "",
        targetTime: "",
      },
    ],
  });

  const [validation, setValidation] = useState<ProgramFormValidation>({
    errors: {},
    inputErrors: {},
  });

  const setTitle = useCallback((title: string) => {
    setFormState((prev) => ({ ...prev, title }));
  }, []);

  const setDescription = useCallback((description: string) => {
    setFormState((prev) => ({ ...prev, description }));
  }, []);

  const setRpe = useCallback((rpe: string) => {
    setFormState((prev) => ({ ...prev, rpe }));
  }, []);

  const addExercise = useCallback(() => {
    setFormState((prev) => ({
      ...prev,
      exercises: [
        ...prev.exercises,
        {
          id: String(Date.now() + Math.random()),
          exerciseId: "",
          exerciseName: "",
          recordType: "",
          targetPart: "",
          targetSets: "",
          restSeconds: "",
          targetWeight: "",
          targetReps: "",
          targetTime: "",
        },
      ],
    }));
  }, []);

  const updateExercise = useCallback(
    (id: string, updater: (ex: ProgramExerciseForm) => ProgramExerciseForm) => {
      setFormState((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) => (ex.id === id ? updater(ex) : ex)),
      }));
    },
    []
  );

  const removeExercise = useCallback((id: string) => {
    setFormState((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((ex) => ex.id !== id),
    }));
    setValidation((prev) => {
      if (!prev.errors.exercises) return prev;
      const copy = { ...prev.errors.exercises };
      delete copy[id];
      return {
        ...prev,
        errors: {
          ...prev.errors,
          exercises: Object.keys(copy).length ? copy : undefined,
        },
      };
    });
  }, []);

  const handleNumericInput = useCallback(
    (value: string, field: string, exerciseId: string) => {
      const errorKey = `${exerciseId}-${field}`;
      const result = validateNumericInput(value);

      if (result.isValid) {
        setValidation((prev) => {
          const copy = { ...prev.inputErrors };
          delete copy[errorKey];
          return { ...prev, inputErrors: copy };
        });
      } else if (result.error) {
        setValidation((prev) => ({
          ...prev,
          inputErrors: { ...prev.inputErrors, [errorKey]: result.error! },
        }));
      }

      return result.sanitizedValue;
    },
    []
  );

  const validateForm = useCallback(() => {
    const errors = validateProgramForm(
      formState.title,
      formState.description,
      formState.exercises
    );
    setValidation((prev) => ({ ...prev, errors }));

    const hasErrors =
      !!errors.title ||
      !!errors.description ||
      (errors.exercises && Object.keys(errors.exercises).length > 0);
    const hasInputErrors = Object.keys(validation.inputErrors).length > 0;

    return !hasErrors && !hasInputErrors;
  }, [formState, validation.inputErrors]);

  return {
    formState,
    validation,
    actions: {
      setTitle,
      setDescription,
      setRpe,
      addExercise,
      updateExercise,
      removeExercise,
      handleNumericInput,
      validateForm,
    },
  };
}
