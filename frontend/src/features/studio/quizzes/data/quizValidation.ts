/** Shared validity rule for quiz questions; used by the editor form, the rail
 *  validity dots, and any import/validation surface that mirrors the server. */
import type { QuizQuestion } from "@/features/studio/quizzes/data/quizFetchers";

export const isQuestionValid = (
  question: Pick<QuizQuestion, "kind" | "prompt" | "options" | "points">,
) =>
  Boolean(
    question.prompt.trim() &&
    question.points >= 0 &&
    question.options.length >= 2 &&
    question.options.every((option) => option.label.trim()) &&
    question.options.filter((option) => option.isCorrect).length >= 1 &&
    (question.kind === "multiple" ||
      question.options.filter((option) => option.isCorrect).length === 1),
  );
