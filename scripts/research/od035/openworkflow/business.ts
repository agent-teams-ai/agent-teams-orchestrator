/** Feature-owned fixture port. No OpenWorkflow dependency. */
export interface ActivationPort {
  approved(id: string): Promise<boolean>;
  activate(id: string, commandId: string, generation?: string): Promise<{ outcome: string }>;
  mark(id: string, event: string, detail?: string): Promise<void>;
}
