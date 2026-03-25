import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardBody, Input, Button, CardFooter } from "@heroui/react";

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const usernameVal = formData.get('username');
    const passwordVal = formData.get('password');
    setError('');
    setLoading(true);
    try {
      await login(usernameVal, passwordVal);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to login');
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
            <div className="bg-danger/10 text-danger p-4 rounded-xl text-sm mb-6 border border-danger/20 backdrop-blur-md flex items-center gap-3">
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
              className="max-w-full"
            />
            <Input
              name="password"
              type="password"
              placeholder="Password"
              variant="bordered"
              isRequired
              className="max-w-full"
            />
            <Button
              type="submit"
              color="primary"
              variant="shadow"
              className="w-full h-12 text-lg font-bold transition-transform active:scale-95"
              isLoading={loading}
            >
              Sign In
            </Button>
          </form>
        </CardBody>
        <CardFooter className="justify-center pt-8 border-t border-divider/50">
          <p className="text-default-400 text-xs font-medium uppercase tracking-widest">Educational Feedback Platform</p>
        </CardFooter>
      </Card>
    </div>
  );
}
