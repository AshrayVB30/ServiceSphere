import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Checkbox } from '../../components/common/Checkbox';
import { USER_ROLES, ROUTES } from '../../constants';

/**
 * Enterprise Login Screen (Apple / Linear Aesthetic)
 * Balanced whitespace, typography, quick demo role credentials selector.
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
    setValue,
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

  // Helper to instantly load one of the four canonical demo credentials
  const fillCredentials = (email, password) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', password, { shouldValidate: true });
    setAuthError('');
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
          </form>

          {/* Quick Demo Credentials Panel for testing all 4 roles */}
          <div className="mt-7 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Quick Role Switcher (Demo)
              </span>
              <span className="text-xs text-slate-400">Click to fill</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-left">
              <button
                type="button"
                onClick={() => fillCredentials('admin@servicesphere.io', 'Password123!')}
                className="p-2.5 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all text-left cursor-pointer group"
              >
                <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-600">
                  Administrator
                </p>
                <p className="text-xs text-slate-400 truncate mt-0.5 font-mono">admin@servicesphere.io</p>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('agent@servicesphere.io', 'Password123!')}
                className="p-2.5 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all text-left cursor-pointer group"
              >
                <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-600">
                  Support Agent
                </p>
                <p className="text-xs text-slate-400 truncate mt-0.5 font-mono">agent@servicesphere.io</p>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('client@acmecorp.com', 'Password123!')}
                className="p-2.5 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all text-left cursor-pointer group"
              >
                <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-600">
                  Client User
                </p>
                <p className="text-xs text-slate-400 truncate mt-0.5 font-mono">client@acmecorp.com</p>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('approver@acmecorp.com', 'Password123!')}
                className="p-2.5 rounded-lg border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all text-left cursor-pointer group"
              >
                <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-600">
                  Approver / Manager
                </p>
                <p className="text-xs text-slate-400 truncate mt-0.5 font-mono">approver@acmecorp.com</p>
              </button>
            </div>
          </div>
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
