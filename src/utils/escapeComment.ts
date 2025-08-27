/**
 * Escapes quotes in comment strings to prevent issues when generating models
 * @param comment The comment string to escape
 * @returns The escaped comment string or undefined if input is null/undefined
 */
export function escapeComment(comment: string | null | undefined): string | undefined {
  if (comment === null || comment === undefined) {
    return undefined;
  }
  
  // Escape single and double quotes
  return comment.replace(/'/g, "\\'").replace(/"/g, '\\"');
}
