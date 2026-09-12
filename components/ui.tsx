export function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-zinc-800">{title}</h2>
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-zinc-600">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none";

export function Button({
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const styles = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-700",
    secondary: "border border-zinc-300 text-zinc-700 hover:bg-zinc-100",
    danger: "border border-red-300 text-red-700 hover:bg-red-50",
  };
  return (
    <button
      {...props}
      className={`rounded-md px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${styles[variant]} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="mt-2 text-sm text-red-600">{message}</p>;
}

export function Badge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 ${className}`}>
      {children}
    </span>
  );
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 text-sm font-medium"
          >
            ✕
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
