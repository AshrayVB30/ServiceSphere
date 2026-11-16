// Import React and useState hook for component state
import React, { useState } from 'react';
// Import Link component for client-side routing
import { Link } from 'react-router-dom';
// Import ArrowLeft and CheckCircle2 icons from Lucide
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
// Import Button component
import { Button } from '../../components/common/Button';
// Import Input component
import { Input } from '../../components/common/Input';
// Import useToast hook
import { useToast } from '../../hooks/useToast';
// Import authService to execute password reset request
import { authService } from '../../services/authService';
// Import route definitions
import { ROUTES } from '../../constants';

/**
 * Enterprise Forgot Password Page Component
 * Allows users to request a password recovery email.
 */
export function ForgotPasswordPage() {
  // Toast notifications dispatcher
  const toast = useToast();
  // State storing entered email address
  const [email, setEmail] = useState('');
  // State indicating if email request has been successfully submitted
  const [submitted, setSubmitted] = useState(false);
  // Submission loading state flag
  const [loading, setLoading] = useState(false);

  // Form submission handler
  const handleSubmit = async (e) => {
    // Prevent default browser form submission
    e.preventDefault();
    // Validate that email is not empty
    if (!email.trim()) return;
    setLoading(true);
    try {
      // Dispatch password reset email request to backend
      await authService.requestPasswordReset(email.trim());
      // Show confirmation state
      setSubmitted(true);
    } catch (err) {
      // Display error notification
      toast.error('Password Reset Failed', err.message);
    } finally {
      // Reset loading state
      setLoading(false);
    }
  };

  // Render forgot password page layout
  return (
    // Fullscreen centered canvas
    <div className="min-h-screen flex flex-col justify-center bg-[#F5F6F8] p-6 sm:p-10">
      {/* Centered container card */}
      <div className="mx-auto w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          {/* Logo image */}
          <img
            src="/logo.png"
            alt="ServiceSphere Logo"
            className="h-12 w-12 mx-auto rounded-xl object-contain shadow-xs mb-3.5"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/logo.svg';
            }}
          />
          {/* Page title */}
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Reset your password
          </h1>
          {/* Subtitle instructions */}
          <p className="mt-1 text-xs text-slate-500">
            Enter your work email address to receive password recovery instructions.
          </p>
        </div>

        {/* Card container */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {/* Conditional view: Confirmation message vs Request form */}
          {submitted ? (
            <div className="text-center py-4 space-y-4">
              {/* Success checkmark badge */}
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">
                Check your inbox
              </h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                We sent a password reset link to <strong className="text-gray-800">{email}</strong>. Please follow the instructions to reset your password.
              </p>
              <div className="pt-4">
                <Link to={ROUTES.LOGIN}>
                  <Button variant="secondary" size="md" className="w-full">
                    Return to sign in
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* Email submission form */
            <form onSubmit={handleSubmit} className="space-y-4.5">
              <Input
                label="Email address"
                type="email"
                placeholder="name@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                className="w-full"
              >
                Send reset link
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

// Export ForgotPasswordPage as default export
export default ForgotPasswordPage;
