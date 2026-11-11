import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowRight, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Checkbox } from '../../components/common/Checkbox';
import { USER_ROLES, ROUTES } from '../../constants';

/**
 * Enterprise User Registration Page
 * Allows new client employees and organization managers to register an account,
 * link or onboard their company workspace, and establish their session directly.
 */
export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [authError, setAuthError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState(USER_ROLES.CLIENT);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: {
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      phone_number: '',
      client_name: '',
      role: USER_ROLES.CLIENT,
      password: '',
      password_confirm: '',
      agreeTerms: true,
    },
  });

  const onSubmit = async (data) => {
    setAuthError('');

    if (data.password !== data.password_confirm) {
      setAuthError('Passwords do not match. Please verify your entries.');
      return;
    }

    if (!data.agreeTerms) {
      setAuthError('You must agree to the Terms of Service to create an account.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        username: data.username.trim(),
        email: data.email.trim().toLowerCase(),
        first_name: data.first_name.trim(),
        last_name: data.last_name?.trim() || '',
        phone_number: data.phone_number?.trim() || '',
        client_name: data.client_name?.trim() || '',
        role: selectedRole || USER_ROLES.CLIENT,
        password: data.password,
        password_confirm: data.password_confirm,
      };

      const newUser = await registerUser(payload);

      toast.success(
        'Account Registered Successfully',
        `Welcome to ServiceSphere, ${newUser.first_name || newUser.username}!`
      );

      // Navigate to role-specific dashboard
      if (newUser.role === USER_ROLES.APPROVER) {
        navigate(ROUTES.APPROVER_DASHBOARD, { replace: true });
      } else {
        navigate(ROUTES.CLIENT_DASHBOARD, { replace: true });
      }
    } catch (err) {
      setAuthError(err.message || 'Registration failed. Please check your submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const onValidationError = (formErrors) => {
    const firstKey = Object.keys(formErrors)[0];
    if (firstKey) {
      setAuthError(formErrors[firstKey]?.message || 'Please fill in all required fields correctly.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-[#F5F6F8] p-6 sm:p-10">
      <div className="mx-auto w-full max-w-lg">
        {/* Brand identity header */}
        <div className="text-center mb-7">
          <img
            src="/logo.png"
            alt="ServiceSphere Logo"
            className="h-12 w-12 mx-auto rounded-xl object-contain shadow-xs mb-3"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/logo.svg';
            }}
          />
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Create your ServiceSphere account
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Enterprise Help Desk & Incident Management Workspace
          </p>
        </div>

        {/* Registration Card */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {authError && (
            <div className="mb-5 rounded-lg bg-red-50 p-3.5 border border-red-200/80 text-xs font-medium text-red-700 leading-relaxed">
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit, onValidationError)} className="space-y-4">
            {/* Name Fields (2 cols) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label="First Name"
                placeholder="Jane"
                type="text"
                autoComplete="given-name"
                required
                error={errors.first_name?.message}
                {...register('first_name', {
                  required: 'First name is required',
                })}
              />

              <Input
                label="Last Name"
                placeholder="Doe"
                type="text"
                autoComplete="family-name"
                error={errors.last_name?.message}
                {...register('last_name')}
              />
            </div>

            {/* Username & Work Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label="Username"
                placeholder="janedoe"
                type="text"
                autoComplete="username"
                required
                error={errors.username?.message}
                {...register('username', {
                  required: 'Username is required',
                  minLength: {
                    value: 3,
                    message: 'Username must be at least 3 characters',
                  },
                  pattern: {
                    value: /^[a-zA-Z0-9_.-]+$/,
                    message: 'Alphanumeric and . _ - characters only',
                  },
                })}
              />

              <Input
                label="Corporate Email"
                placeholder="jane@company.com"
                type="email"
                autoComplete="email"
                required
                error={errors.email?.message}
                {...register('email', {
                  required: 'Corporate email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address format',
                  },
                })}
              />
            </div>

            {/* Organization & Optional Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label="Company / Organization"
                placeholder="Your company or organization name"
                type="text"
                error={errors.client_name?.message}
                {...register('client_name')}
              />

              <Input
                label="Phone Number (Optional)"
                placeholder="+1 (555) 019-2834"
                type="tel"
                autoComplete="tel"
                error={errors.phone_number?.message}
                {...register('phone_number')}
              />
            </div>

            {/* Role / Account Type Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Account Purpose & Access Role
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole(USER_ROLES.CLIENT);
                    setValue('role', USER_ROLES.CLIENT);
                  }}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                    selectedRole === USER_ROLES.CLIENT
                      ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600/30'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <User className={`h-4 w-4 ${selectedRole === USER_ROLES.CLIENT ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="text-xs font-semibold text-slate-900">Client User</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                    Submit, track, and communicate on incident tickets.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole(USER_ROLES.APPROVER);
                    setValue('role', USER_ROLES.APPROVER);
                  }}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                    selectedRole === USER_ROLES.APPROVER
                      ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600/30'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className={`h-4 w-4 ${selectedRole === USER_ROLES.APPROVER ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="text-xs font-semibold text-slate-900">Approver / Manager</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                    Review and authorize operational requests & SLA credits.
                  </p>
                </button>
              </div>
            </div>

            {/* Password & Confirmation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Input
                label="Password"
                placeholder="••••••••••••"
                type="password"
                autoComplete="new-password"
                required
                helperText="Min. 8 chars (letters, numbers, symbols)"
                error={errors.password?.message}
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Minimum 8 characters required',
                  },
                })}
              />

              <Input
                label="Confirm Password"
                placeholder="••••••••••••"
                type="password"
                autoComplete="new-password"
                required
                error={errors.password_confirm?.message}
                {...register('password_confirm', {
                  required: 'Please confirm your password',
                  validate: (val) => val === getValues('password') || 'Passwords do not match',
                })}
              />
            </div>

            {/* Terms Agreement Checkbox */}
            <div className="pt-1">
              <Checkbox
                label="I agree to the ServiceSphere Platform Terms & Enterprise Security Policies"
                defaultChecked={true}
                error={errors.agreeTerms?.message}
                {...register('agreeTerms', {
                  required: 'You must agree to the Terms of Service to create an account.',
                })}
              />
            </div>

            {/* Submit Action Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={submitting}
                className="w-full"
                rightIcon={ArrowRight}
              >
                Create Account
              </Button>
            </div>

            {/* Sign in redirect */}
            <div className="text-center pt-2">
              <p className="text-xs text-slate-500">
                Already have an account?{' '}
                <Link
                  to={ROUTES.LOGIN}
                  className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Security Footer */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Protected by Enterprise-grade Session Encryption and Multi-Tenant Tenant Isolation.
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
