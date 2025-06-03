// src/components/Auth.jsx
import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { toast } from 'react-toastify'; // <--- Import toast

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isSigningUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success('Account created successfully! You are now logged in.'); // <--- Replaced alert
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Logged in successfully!'); // <--- Replaced alert
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message);
      toast.error(`Authentication failed: ${err.message}`); // <--- Replaced alert with error toast
    }
  };

  return (
    <form onSubmit={handleAuth} className="space-y-4">
      <p className="text-gray-600 text-center mb-6 text-base">
        Please sign in or create an account to manage your rental rooms.
      </p>
      <h3 className="text-2xl font-bold text-center mb-4 text-gray-800">{isSigningUp ? 'Create Account' : 'Sign In'}</h3>
      {error && <p className="text-red-500 text-sm text-center bg-red-100 p-2 rounded-md border border-red-200">{error}</p>}
      <div>
        <label htmlFor="email" className="sr-only">Email</label>
        <input
          type="email"
          id="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          required
        />
      </div>
      <div>
        <label htmlFor="password" className="sr-only">Password</label>
        <input
          type="password"
          id="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-gray-300 p-3 w-full rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          required
        />
      </div>
      <button
        type="submit"
        className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 cursor-pointer"
      >
        {isSigningUp ? 'Sign Up' : 'Sign In'}
      </button>
      <button
        type="button"
        onClick={() => {
          setIsSigningUp(!isSigningUp);
          setError('');
          setEmail('');
          setPassword('');
        }}
        className="w-full text-indigo-600 text-sm mt-2 hover:text-indigo-800 transition-colors duration-200 cursor-pointer"
      >
        {isSigningUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
      </button>
    </form>
  );
}