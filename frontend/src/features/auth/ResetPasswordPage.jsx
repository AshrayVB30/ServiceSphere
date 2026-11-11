import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowLeft, KeyRound } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useToast } from '../../hooks/useToast';
import { authService } from '../../services/authService';
import { ROUTES } from '../../constants';

export function ResetPasswordPage() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword !== newPasswordConfirm) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('Password must contain at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await authService.confirmPasswordReset({
        uid,
        token,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      });
      setSuccess(true);
      toast.success('Password Reset', 'Your password has been successfully updated.');
    } catch (err) {
      setErrorMsg(err.message || 'Password reset failed. Link may be invalid or expired.');
      toast.error('Reset Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-[#F5F6F8] p-6 sm:p-10">
      <div className="mx-auto w-full max-w-md">
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
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Set new password
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Choose a strong, compliant password for your ServiceSphere account.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {success ? (
            <div className="text-center py-4 space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">
                Password successfully updated
              </h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                Your credentials have been securely refreshed. You can now access your workspace with your new password.
              </p>
              <div className="pt-4">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={() => navigate(ROUTES.LOGIN)}
                >
                  Proceed to Sign In
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4.5">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {errorMsg}
                </div>
              )}

              <Input
                label="New Password"
                type="password"
                placeholder="••••••••••••"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                helperText="Must be at least 8 characters with numbers or symbols."
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="••••••••••••"
                required
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                className="w-full"
                leftIcon={KeyRound}
              >
                Reset Password
              </Button>

              <div className="pt-2 text-center">
                <Link
                  to={ROUTES.LOGIN}
                  className="inline-flex items-center text-xs font-medium text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
