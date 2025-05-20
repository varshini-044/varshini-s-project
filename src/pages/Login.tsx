import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getSystemInfo, SystemInfo } from '../utils/browserDetection';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const detectSystem = async () => {
      const info = await getSystemInfo();
      setSystemInfo(info);

      // Check if access is allowed based on device and time
      if (info.deviceType === 'mobile') {
        const now = new Date();
        const hour = now.getHours();
        if (hour < 10 || hour >= 13) {
          setError('Mobile access is only allowed between 10 AM and 1 PM');
          return;
        }
      }
    };

    detectSystem();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!systemInfo) return;

      // Microsoft browser allows direct login
      if (systemInfo.browser.toLowerCase().includes('edge') || 
          systemInfo.browser.toLowerCase().includes('ie')) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) throw signInError;

        // Record login
        await supabase.from('login_history').insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          ...systemInfo
        });

        navigate('/dashboard');
        return;
      }

      // Chrome requires OTP
      if (systemInfo.browser.toLowerCase().includes('chrome')) {
        if (!showOtp) {
          // Send OTP email
          await supabase.auth.signInWithOtp({
            email
          });
          setShowOtp(true);
          return;
        }

        // Verify OTP
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: 'email'
        });

        if (verifyError) throw verifyError;

        // Record login
        await supabase.from('login_history').insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          ...systemInfo
        });

        navigate('/dashboard');
        return;
      }

      // Default login for other browsers
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) throw signInError;

      // Record login
      await supabase.from('login_history').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        ...systemInfo
      });

      navigate('/dashboard');

    } catch (err) {
      setError('Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-6 sm:p-8 rounded-xl shadow-lg transform transition-all hover:scale-105">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome Back
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please sign in to your account
          </p>
        </div>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded" role="alert">
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>

            {!showOtp && (
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                />
              </div>
            )}

            {showOtp && (
              <div>
                <label htmlFor="otp" className="sr-only">Enter OTP</label>
                <input
                  id="otp"
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Enter OTP"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <a href="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              {showOtp ? 'Verify OTP' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}