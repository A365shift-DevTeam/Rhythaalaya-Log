// Central re-export so call sites depend on a stable local path rather than the
// toast library directly. Use `toast.success(...)`, `toast.error(...)`, etc.
export { toast } from 'sonner';
export type { ExternalToast } from 'sonner';
