import SiteHeader from '@/components/main/site-header';

export default function WatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      {children}
    </div>
  );
}