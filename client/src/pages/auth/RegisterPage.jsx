import { useState } from 'react';

import { useNavigate } from 'react-router';

import { registerCustomer } from '../../api/authApi.js';

import { normalizeApiError } from '../../api/errors.js';

import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';

import { AuthFooterLink } from '../../features/auth/components/AuthFooterLink.jsx';
import { AuthPageHeader } from '../../features/auth/components/AuthPageHeader.jsx';

import { AUTH_PASSWORD_HINT } from '../../features/auth/auth.constants.js';

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

      navigate(
        '/auth/verify-email',

        {
          state: {
            email: form.email,

            fromRegistration: true,
          },
        },
      );
    } catch (requestError) {
      const apiError = normalizeApiError(
        requestError,

        'Registration failed.',
      );

      setErrors(apiError.fields);

      setMessage(apiError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <AuthPageHeader
        eyebrow='Join MultiSports'
        title='Create your account'
        description='Create a Customer account to start shopping.'
      />

      <form onSubmit={handleSubmit} className='mt-8 space-y-5'>
        <Input
          id='register-name'
          name='name'
          label='Name'
          type='text'
          autoComplete='name'
          required
          value={form.name}
          disabled={loading}
          placeholder='Your name'
          error={errors.name}
          onChange={handleChange}
        />

        <Input
          id='register-email'
          name='email'
          label='Email'
          type='email'
          autoComplete='email'
          required
          value={form.email}
          disabled={loading}
          placeholder='you@example.com'
          error={errors.email}
          onChange={handleChange}
        />

        <Input
          id='register-password'
          name='password'
          label='Password'
          type='password'
          autoComplete='new-password'
          required
          minLength={8}
          maxLength={128}
          value={form.password}
          disabled={loading}
          placeholder='Create a password'
          hint={errors.password ? undefined : AUTH_PASSWORD_HINT}
          error={errors.password}
          onChange={handleChange}
        />

        <Input
          id='register-confirm-password'
          name='confirmPassword'
          label='Confirm password'
          type='password'
          autoComplete='new-password'
          required
          minLength={8}
          maxLength={128}
          value={form.confirmPassword}
          disabled={loading}
          placeholder='Enter your password again'
          error={errors.confirmPassword}
          onChange={handleChange}
        />

        {message ? <Alert variant='danger'>{message}</Alert> : null}

        <Button type='submit' size='lg' disabled={loading} className='w-full'>
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <AuthFooterLink to='/auth/login' linkLabel='Login'>
        Already have an account?
      </AuthFooterLink>
    </div>
  );
}

export default RegisterPage;
