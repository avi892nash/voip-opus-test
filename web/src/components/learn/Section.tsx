import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface SectionProps {
  id?: string;
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  tone?: 'light' | 'tinted';
}

/**
 * Shared scaffolding for every Learn section. Keeps spacing, typography, and
 * scroll-anchor IDs consistent so each section reads as part of one tutorial.
 */
export default function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
  tone = 'light',
}: SectionProps) {
  const bg = tone === 'tinted' ? 'bg-gray-50' : 'bg-white';
  return (
    <section id={id} className={`${bg} py-14 sm:py-20`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          {eyebrow && (
            <p className="text-primary-600 font-semibold uppercase tracking-wide text-xs sm:text-sm">
              {eyebrow}
            </p>
          )}
          <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
            {title}
          </h2>
          {intro && (
            <div className="mt-4 text-gray-700 text-base sm:text-lg leading-relaxed space-y-4">
              {intro}
            </div>
          )}
        </motion.div>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

export function Cite({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-primary-600 hover:text-primary-700 underline decoration-dotted underline-offset-2"
    >
      {children}
    </a>
  );
}

export function Aside({ children }: { children: ReactNode }) {
  return (
    <aside className="mt-6 border-l-4 border-primary-200 bg-primary-50/40 px-4 py-3 rounded-r-lg text-sm text-gray-700">
      {children}
    </aside>
  );
}
