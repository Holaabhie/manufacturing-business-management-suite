export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080c14",
        fontFamily: "var(--font-outfit), sans-serif",
      }}
    >
      {children}
    </div>
  );
}
