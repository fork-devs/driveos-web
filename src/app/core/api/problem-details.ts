/** RFC 7807 error body, the format chosen for every service (chapter 4.1.7.1). */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}
