import { BRAND } from '@/lib/brand';

export const metadata = {
  title: 'Features',
  description: `Explore ${BRAND.name} features: floorplan analysis, room detection, and materials estimation for construction.`,
};

const features = [
  {
    title: 'Floorplan upload & parsing',
    description: 'Upload PDF or image floorplans. We detect walls, rooms, and dimensions so you get structured area data without manual tracing.',
  },
  {
    title: 'Room & area detection',
    description: 'Automatic room labeling and square footage per space. Support for multi-level plans and common construction units (sq ft, sq m).',
  },
  {
    title: 'Materials estimation & takeoffs',
    description: 'Generate material quantities from your plans: flooring, paint, trim, drywall, and more. Adjust waste factors and unit costs.',
  },
  {
    title: 'Export & reporting',
    description: 'Export takeoffs and estimates to CSV or Excel. Share reports with your team or clients and keep everything in one place.',
  },
  {
    title: 'Secure & organized',
    description: 'Project-based storage, org-scoped data, and encrypted uploads. Built for contractors and estimators who need reliability.',
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Features</h1>
      <p className="mt-2 text-muted-foreground">
        Everything you need for floorplan and materials estimation — built for construction.
      </p>
      <ul className="mt-12 space-y-10">
        {features.map((f) => (
          <li key={f.title}>
            <h2 className="text-xl font-semibold" style={{ color: BRAND.colors.primary }}>
              {f.title}
            </h2>
            <p className="mt-2 text-muted-foreground leading-relaxed">{f.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
