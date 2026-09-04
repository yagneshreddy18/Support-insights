import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { FiUser, FiMail, FiLock, FiArrowRight, FiShield, FiTrendingUp } from 'react-icons/fi';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Mirrors backend passwordIssues() so weak passwords are caught instantly
  const passwordChecks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'One uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', pass: /[a-z]/.test(password) },
    { label: 'One number', pass: /[0-9]/.test(password) },
    { label: 'One symbol', pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const isPasswordStrong = passwordChecks.every((c) => c.pass) && password.length <= 72;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (cleanName.length < 2 || cleanName.length > 60) {
      setError('Name must be 2-60 characters.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      setError('Please enter a valid work email address.');
      return;
    }
    if (!isPasswordStrong) {
      setError('Password must be 8+ chars with uppercase, lowercase, number, and symbol.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      // NOTE: backend is intentionally non-enumerating — it returns the same
      // generic message whether the email is new or taken. Do NOT auto-login
      // here (that would create a login oracle). Always route to /login.
      const res = await axios.post('/api/auth/register', { name: cleanName, email: cleanEmail, password });
      const msg = res.data?.message || 'Registration received. If this email is new, an account has been created. Please log in.';
      setSuccess(msg);
      setTimeout(() => navigate('/login', { state: { info: msg } }), 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--border-card)',
        borderRadius: 'var(--radius-xl)',
        padding: '2.75rem 2.25rem',
        boxShadow: 'var(--shadow-lg), var(--shadow-glow), var(--inner-highlight)',
        position: 'relative',
        zIndex: 1,
        animation: 'slideFadeIn 0.3s ease'
      }}>
        {/* Brand Icon & Heading */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--primary), var(--accent-purple))',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            color: '#ffffff',
            boxShadow: '0 8px 24px var(--primary-glow)',
            marginBottom: '1rem'
          }}>
            <FiTrendingUp />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)' }}>
            Create Account
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Join the Support Insights AI operations team
          </p>
        </div>

        {error && (
          <div style={{
            background: 'var(--rose-bg)',
            border: '1px solid var(--rose-border)',
            color: '#fb7185',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.3)',
            color: '#34d399',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Full Name
            </label>
            <div style={{ position: 'relative' }}>
              <FiUser style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontSize: '1rem' }} />
              <input
                type="text"
                placeholder="Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  paddingLeft: '2.75rem',
                  paddingRight: '1rem',
                  paddingTop: '0.75rem',
                  paddingBottom: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Work Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <FiMail style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontSize: '1rem' }} />
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  paddingLeft: '2.75rem',
                  paddingRight: '1rem',
                  paddingTop: '0.75rem',
                  paddingBottom: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <FiLock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontSize: '1rem' }} />
              <input
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                maxLength={72}
                style={{
                  width: '100%',
                  paddingLeft: '2.75rem',
                  paddingRight: '1rem',
                  paddingTop: '0.75rem',
                  paddingBottom: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '0.95rem'
                }}
              />
            </div>
            {/* Live password-strength checklist (mirrors backend rules) */}
            {password.length > 0 && (
              <ul style={{ listStyle: 'none', margin: '0.6rem 0 0', padding: 0, fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {passwordChecks.map((c) => (
                  <li key={c.label} style={{ color: c.pass ? '#34d399' : 'var(--text-dim)' }}>
                    {c.pass ? '✓' : '○'} {c.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <FiLock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontSize: '1rem' }} />
              <input
                type="password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  paddingLeft: '2.75rem',
                  paddingRight: '1rem',
                  paddingTop: '0.75rem',
                  paddingBottom: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-card)',
                  background: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isPasswordStrong}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '0.85rem',
              justifyContent: 'center',
              fontSize: '0.95rem',
              marginTop: '0.5rem'
            }}
          >
            {loading ? 'Creating Account...' : <><span>Complete Registration</span> <FiArrowRight /></>}
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>

        <div style={{
          marginTop: '2rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem',
          fontSize: '0.75rem',
          color: 'var(--text-dim)'
        }}>
          <FiShield /> Protected by Enterprise Security Architecture
        </div>
      </div>
    </div>
  );
};

export default Register;
