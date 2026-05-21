import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/call';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(identifier, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not log in');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pt-28 pb-16 min-h-[80vh] flex items-start sm:items-center justify-center bg-gray-50">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-soft p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome back</h1>
          <p className="mt-2 text-gray-600 text-sm">Log in to make and receive voice calls.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Username or email</span>
              <input
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
              />
            </label>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg bg-primary-600 text-white font-semibold hover:bg-primary-700 disabled:bg-gray-300 transition-colors"
            >
              {submitting ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <p className="mt-6 text-sm text-center text-gray-600">
            New here?{' '}
            <Link to="/signup" className="text-primary-600 font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
