import { useState } from 'react';

import { Link, useNavigate } from 'react-router';

import { registerCustomer } from '../../api/authApi.js';

import { normalizeApiError } from '../../api/errors.js';

function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: undefined,
    }));

    setMessage('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setErrors({});
    setMessage('');

    try {
      await registerCustomer({
        name: form.name,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });

      navigate('/auth/verify-email', {
        state: {
          email: form.email,
          fromRegistration: true,
        },
      });
    } catch (requestError) {
      const apiError = normalizeApiError(requestError, 'Registration failed.');

      setErrors(apiError.fields);
      setMessage(apiError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className='text-sm font-medium uppercase tracking-[0.2em] text-neutral-500'>
        Join MultiSports
      </p>

      <h1 className='mt-3 text-3xl font-semibold'>Create your account</h1>

      <p className='mt-3 text-sm leading-6 text-neutral-600'>
        Create a customer account to start shopping.
      </p>

      <form onSubmit={handleSubmit} className='mt-8 space-y-5'>
        <div>
          <label htmlFor='name' className='mb-2 block text-sm font-medium'>
            Name
          </label>

          <input
            id='name'
            name='name'
            type='text'
            autoComplete='name'
            required
            value={form.name}
            disabled={loading}
            onChange={handleChange}
            placeholder='Your name'
            className='w-full border border-neutral-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100'
          />

          {errors.name && (
            <p className='mt-2 text-sm text-red-600'>{errors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor='email' className='mb-2 block text-sm font-medium'>
            Email
          </label>

          <input
            id='email'
            name='email'
            type='email'
            autoComplete='email'
            required
            value={form.email}
            disabled={loading}
            onChange={handleChange}
            placeholder='you@example.com'
            className='w-full border border-neutral-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100'
          />

          {errors.email && (
            <p className='mt-2 text-sm text-red-600'>{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor='password' className='mb-2 block text-sm font-medium'>
            Password
          </label>

          <input
            id='password'
            name='password'
            type='password'
            autoComplete='new-password'
            required
            minLength={8}
            maxLength={128}
            value={form.password}
            disabled={loading}
            onChange={handleChange}
            placeholder='Create a password'
            className='w-full border border-neutral-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100'
          />

          <p className='mt-2 text-xs text-neutral-500'>
            8–128 characters with at least one letter and one number.
          </p>

          {errors.password && (
            <p className='mt-2 text-sm text-red-600'>{errors.password}</p>
          )}
        </div>

        <div>
          <label
            htmlFor='confirmPassword'
            className='mb-2 block text-sm font-medium'>
            Confirm password
          </label>

          <input
            id='confirmPassword'
            name='confirmPassword'
            type='password'
            autoComplete='new-password'
            required
            minLength={8}
            maxLength={128}
            value={form.confirmPassword}
            disabled={loading}
            onChange={handleChange}
            placeholder='Enter your password again'
            className='w-full border border-neutral-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-neutral-100'
          />

          {errors.confirmPassword && (
            <p className='mt-2 text-sm text-red-600'>
              {errors.confirmPassword}
            </p>
          )}
        </div>

        {message && (
          <div
            role='alert'
            className='border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {message}
          </div>
        )}

        <button
          type='submit'
          disabled={loading}
          className='w-full bg-black px-4 py-3 font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50'>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <div className='mt-8 border-t border-neutral-200 pt-6 text-center'>
        <p className='text-sm text-neutral-600'>
          Already have an account?{' '}
          <Link
            to='/auth/login'
            className='font-medium text-black underline underline-offset-4'>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
