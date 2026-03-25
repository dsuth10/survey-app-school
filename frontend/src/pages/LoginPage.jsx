import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardBody, Input, Button } from "@heroui/react";

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const usernameVal = String(formData.get('username') ?? '').trim();
    const passwordVal = String(formData.get('password') ?? '');

    if (loading) return;
    if (!usernameVal) {
      setError('Please enter your username.');
      return;
    }
    if (!passwordVal) {
      setError('Please enter your password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(usernameVal, passwordVal);
      navigate('/dashboard');
    } catch (err) {
      const status = err?.response?.status;
      const backendError = err?.response?.data?.error;

      // Map common auth failures into friendlier messages.
      if (status === 401) setError(backendError || 'Invalid username or password.');
      else if (status === 403) setError(backendError || 'Account is deactivated.');
      else if (status === 429) setError(backendError || 'Too many login attempts. Please try again later.');
      else setError(backendError || 'Failed to login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-100 via-background to-secondary-100 px-4">
      <Card
        isBlurred
        className="max-w-md w-full border-1 border-white/20 bg-background/40 backdrop-blur-xl dark:bg-default-100/20 shadow-2xl p-4"
      >
        <CardHeader className="flex flex-col gap-1 items-center pb-8">
          <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Survey App
          </h2>
          <p className="text-default-500 font-medium">Welcome back, please sign in</p>
        </CardHeader>
        <CardBody>
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="bg-danger/10 text-danger p-4 rounded-xl text-sm mb-6 border border-danger/20 backdrop-blur-md flex items-center gap-3"
            >
              <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              name="username"
              type="text"
              placeholder="Username"
              variant="bordered"
              isRequired
              autoComplete="username"
              aria-label="Username"
              className="max-w-full"
            />
            <Input
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              variant="bordered"
              isRequired
              autoComplete="current-password"
              aria-label="Password"
              className="max-w-full"
              endContent={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-sm font-bold text-default-500 hover:text-primary active:scale-95 transition-transform"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-sm">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              }
            />
            <Button
              type="submit"
              color="primary"
              variant="shadow"
              className="w-full h-12 text-lg font-bold transition-transform active:scale-95"
              isLoading={loading}
              isDisabled={loading}
            >
              Sign In
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
