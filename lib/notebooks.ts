import type { Notebook } from "@/lib/generated/prisma/client";

export const TITLE_MAX = 200;
/** Generous for free-form notes, but stops a runaway paste filling the database. */
export const BODY_MAX = 200_000;

export interface NotebookView {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export function toNotebookView(notebook: Notebook): NotebookView {
  return {
    id: notebook.id,
    title: notebook.title,
    body: notebook.body,
    createdAt: notebook.createdAt.toISOString(),
    updatedAt: notebook.updatedAt.toISOString(),
  };
}
