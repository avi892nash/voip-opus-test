import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="pt-32 pb-16 min-h-[60vh] flex items-center justify-center">
      <div className="text-center px-4">
        <p className="text-6xl font-bold text-gray-300">404</p>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-2 text-gray-600">That route doesn't exist.</p>
        <Link
          to="/"
          className="inline-block mt-6 px-6 py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
