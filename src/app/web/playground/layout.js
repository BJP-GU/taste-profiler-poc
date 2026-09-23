// Full-bleed canvas under the nav, outside the root main max-w-3xl constraint.
export default function PlaygroundLayout({ children }) {
  return (
    <div className="fixed inset-x-0 bottom-0 top-[3.25rem] z-10 flex flex-col bg-neutral-50">
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
