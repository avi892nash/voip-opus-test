import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await signup(username.trim(), email.trim(), password);
      navigate('/call', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create account');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pt-28 pb-16 min-h-[80vh] flex items-start sm:items-center justify-center bg-gray-50">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-soft p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-2 text-gray-600 text-sm">
            Pick a username — that's how friends will call you.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Username</span>
              <input
                type="text"
                autoComplete="username"
                required
                minLength={3}
                maxLength={32}
                pattern="[A-Za-z0-9_\-]+"
                title="Letters, numbers, hyphen, underscore"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Password</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition"
              />
              <span className="text-xs text-gray-500 mt-1 block">At least 8 characters.</span>
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
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-sm text-center text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
