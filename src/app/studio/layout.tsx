export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`footer { display: none !important; }`}</style>
      {children}
    </>
  )
}
