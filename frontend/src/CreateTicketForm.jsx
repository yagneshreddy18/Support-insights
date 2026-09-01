import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CreateTicketForm = ({ onTicketCreated }) => {
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({
    customer_id: '',
    category_id: '',
    subject: '',
    description: '',
    priority: 'Medium',
    channel: 'Portal'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const [custRes, catRes] = await Promise.all([
          axios.get('/api/customers'),
          axios.get('/api/categories')
        ]);
        setCustomers(custRes.data);
        setCategories(catRes.data);
        if (custRes.data.length > 0) setFormData(prev => ({ ...prev, customer_id: custRes.data[0].id }));
        if (catRes.data.length > 0) setFormData(prev => ({ ...prev, category_id: catRes.data[0].id }));
      } catch (err) {
        console.error("Failed to load form dependencies:", err);
      }
    };
    fetchFormData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await axios.post('/api/tickets', formData);
      setSuccess('Ticket created successfully!');
      setFormData({
        ...formData,
        subject: '',
        description: '',
      });
      if (onTicketCreated) onTicketCreated();
    } catch (err) {
      console.error(err);
      setError('Failed to create ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <div className="card-title" style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Create New Ticket</div>

      {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}
      {success && <div style={{ color: 'var(--warning)', marginBottom: '1rem' }}>{success}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Customer</label>
            <select name="customer_id" value={formData.customer_id} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }} required>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Category</label>
            <select name="category_id" value={formData.category_id} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }} required>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Priority</label>
            <select name="priority" value={formData.priority} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Channel</label>
            <select name="channel" value={formData.channel} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}>
              <option value="Portal">Portal</option>
              <option value="Email">Email</option>
              <option value="Phone">Phone</option>
              <option value="Chat">Chat</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Subject</label>
          <input type="text" name="subject" value={formData.subject} onChange={handleChange} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }} required />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Description</label>
          <textarea name="description" value={formData.description} onChange={handleChange} rows="4" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }} required></textarea>
        </div>

        <button type="submit" disabled={isSubmitting} style={{ alignSelf: 'flex-start', padding: '0.75rem 1.5rem', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          {isSubmitting ? 'Creating...' : 'Create Ticket'}
        </button>
      </form>
    </div>
  );
};

export default CreateTicketForm;

