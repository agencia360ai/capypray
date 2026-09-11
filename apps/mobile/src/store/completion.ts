import type { Lesson } from "@capy/content";
import { isoDate } from "./kid";

export function completionKey(lesson: Pick<Lesson, "id" | "routine">, date = new Date()) {
  return lesson.routine === "any" || lesson.routine === "intro" ? lesson.id : `${lesson.id}:${isoDate(date)}`;
}
