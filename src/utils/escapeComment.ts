/**
 * Escapes quotes in comment strings to prevent issues when generating models
 * @param comment The comment string to escape
 * @returns The escaped comment string or undefined if input is null/undefined
 */
export function escapeComment(comment: string | null | undefined): string | undefined {
  if (comment === null || comment === undefined) {
    return undefined;
  }

  // Comments are emitted inside double-quoted strings, so single quotes and
  // forward slashes do not need escaping.
  return comment.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
