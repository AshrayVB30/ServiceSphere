// Import React and useState hook for component state
import React, { useState } from 'react';
// Import routing hooks and components
import { useParams, Link, useNavigate } from 'react-router-dom';
// Import CheckCircle2, ArrowLeft, and KeyRound icons from Lucide
import { CheckCircle2, ArrowLeft, KeyRound } from 'lucide-react';
// Import common Button component
import { Button } from '../../components/common/Button';
// Import common Input component
import { Input } from '../../components/common/Input';
// Import useToast hook to display notification popups
import { useToast } from '../../hooks/useToast';
// Import authService to execute password reset confirmation
import { authService } from '../../services/authService';
// Import route definitions
import { ROUTES } from '../../constants';

/**
 * Enterprise Password Reset Confirmation Page
 * Validates recovery token from URL parameters and sets new account password.
 */
export function ResetPasswordPage() {
  // Extract uid and token route parameters from URL
  const { uid, token } = useParams();
  // Navigation hook
  const navigate = useNavigate();
  // Toast notifications dispatcher
  const toast = useToast();

  // State storing entered new password
  const [newPassword, setNewPassword] = useState('');
  // State storing entered confirmation password
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  // Submission loading state flag
  const [loading, setLoading] = useState(false);
  // Success state flag
  const [success, setSuccess] = useState(false);
  // Error message state
  const [errorMsg, setErrorMsg] = useState('');

  // Form submission handler
  const handleSubmit = async (e) => {
    // Prevent default browser form submission
    e.preventDefault();
    setErrorMsg('');

    // Client-side password matching check
    if (newPassword !== newPasswordConfirm) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    // Minimum password length check
    if (newPassword.length < 8) {
      setErrorMsg('Password must contain at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      // Dispatch password reset confirmation request to backend
      await authService.confirmPasswordReset({
        uid,
        token,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      });
      // Show success view
      setSuccess(true);
      // Display success toast notification
      toast.success('Password Reset', 'Your password has been successfully updated.');
    } catch (err) {
      // Display error message
      setErrorMsg(err.message || 'Password reset failed. Link may be invalid or expired.');
      toast.error('Reset Failed', err.message);
    } finally {
      // Reset loading flag
      setLoading(false);
    }
  };

  // Render password reset confirmation layout
  return (
    // Fullscreen centered canvas
    <div className="min-h-screen flex flex-col justify-center bg-[#F5F6F8] p-6 sm:p-10">
      <div className="mx-auto w-full max-w-md">
        {/* Brand identity header */}
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

        {/* Card container */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {success ? (
            /* Success confirmation screen */
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
            /* New password entry form */
            <form onSubmit={handleSubmit} className="space-y-4.5">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {errorMsg}
                </div>
              )}

              {/* New password input */}
              <Input
                label="New Password"
                type="password"
                placeholder="••••••••••••"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                helperText="Must be at least 8 characters with numbers or symbols."
              />

              {/* Confirm password input */}
              <Input
                label="Confirm New Password"
                type="password"
                placeholder="••••••••••••"
                required
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
              />

              {/* Submit button */}
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

              {/* Return to login link */}
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

// Export ResetPasswordPage as default export
export default ResetPasswordPage;
