export default function Section({
  title,
  right
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-semibold text-white/90">{title}</h2>
      {right}
    </div>
  );
}
