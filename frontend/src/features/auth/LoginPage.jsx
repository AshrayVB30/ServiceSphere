import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Checkbox } from '../../components/common/Checkbox';
import { USER_ROLES, ROUTES } from '../../constants';

/**
 * Enterprise Login Screen (Apple / Linear Aesthetic)
 * Minimalist, high contrast, clean enterprise authentication.
 */
export function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [authError, setAuthError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  });

  const from = location.state?.from?.pathname || ROUTES.DASHBOARD;

  const onSubmit = async (data) => {
    setAuthError('');
    setSubmitting(true);
    try {
      const user = await login({
        email: data.email,
        password: data.password,
      });

      toast.success(
        'Welcome back',
        `Signed in successfully as ${user.first_name || user.username}`
      );

      // Navigate to destination or role-specific home
      if (from !== ROUTES.DASHBOARD && from !== ROUTES.LOGIN) {
        navigate(from, { replace: true });
      } else {
        switch (user.role) {
          case USER_ROLES.ADMIN:
            navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
            break;
          case USER_ROLES.SUPPORT_AGENT:
            navigate(ROUTES.AGENT_DASHBOARD, { replace: true });
            break;
          case USER_ROLES.CLIENT:
            navigate(ROUTES.CLIENT_DASHBOARD, { replace: true });
            break;
          case USER_ROLES.APPROVER:
            navigate(ROUTES.APPROVER_DASHBOARD, { replace: true });
            break;
          default:
            navigate(ROUTES.DASHBOARD, { replace: true });
        }
      }
    } catch (err) {
      setAuthError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-[#F5F6F8] p-6 sm:p-10">
      <div className="mx-auto w-full max-w-md">
        {/* Brand identity */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="ServiceSphere Logo"
            className="h-12 w-12 mx-auto rounded-xl object-contain shadow-xs mb-3.5"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/logo.svg';
            }}
          />
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Sign in to ServiceSphere
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Enterprise Help Desk & Incident Management System
          </p>
        </div>

        {/* Login form card */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {authError && (
            <div className="mb-5 rounded-lg bg-red-50 p-3.5 border border-red-200/80 text-xs font-medium text-red-700 leading-relaxed">
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email or Username"
              placeholder="name@company.com"
              type="text"
              autoComplete="username"
              required
              error={errors.email?.message}
              {...register('email', {
                required: 'Email or username is required',
              })}
            />

            <div>
              <Input
                label="Password"
                placeholder="••••••••••••"
                type="password"
                autoComplete="current-password"
                required
                error={errors.password?.message}
                {...register('password', {
                  required: 'Password is required',
                })}
              />
              <div className="flex items-center justify-between mt-2.5">
                <Checkbox
                  label="Remember me"
                  {...register('rememberMe')}
                />
                <Link
                  to={ROUTES.FORGOT_PASSWORD}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={submitting}
                className="w-full"
                rightIcon={ArrowRight}
              >
                Sign In
              </Button>
            </div>

            <div className="text-center pt-2">
              <p className="text-xs text-slate-500">
                Don't have an account?{' '}
                <Link
                  to={ROUTES.REGISTER}
                  className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <p className="mt-6 text-center text-xs text-gray-500">
          Protected by Enterprise-grade Role-Based Access Control and Session Isolation.
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
