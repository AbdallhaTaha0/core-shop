import { useState, type FormEvent } from 'react';
import type { Address } from '../lib/api';
import { errorText } from '../lib/errors';

export function AddressForm({
  onSave,
  onCancel,
}: {
  onSave: (address: Omit<Address, 'id' | 'isDefault'>) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    label: '',
    fullName: '',
    line1: '',
    line2: '',
    city: '',
    postalCode: '',
    country: 'US',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onSave({
        ...form,
        label: form.label || null,
        line2: form.line2 || null,
      });
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="address-form" onSubmit={submit}>
      <div className="form-two">
        <label>
          Address label
          <input
            value={form.label}
            maxLength={30}
            placeholder="Home, office…"
            onChange={(event) => setForm({ ...form, label: event.target.value })}
          />
        </label>
        <label>
          Full name
          <input
            required
            value={form.fullName}
            onChange={(event) => setForm({ ...form, fullName: event.target.value })}
          />
        </label>
      </div>
      <label>
        Address line 1
        <input
          required
          value={form.line1}
          onChange={(event) => setForm({ ...form, line1: event.target.value })}
        />
      </label>
      <label>
        Address line 2 <span>(optional)</span>
        <input
          value={form.line2}
          onChange={(event) => setForm({ ...form, line2: event.target.value })}
        />
      </label>
      <div className="form-two">
        <label>
          City
          <input
            required
            value={form.city}
            onChange={(event) => setForm({ ...form, city: event.target.value })}
          />
        </label>
        <label>
          Postal code
          <input
            required
            value={form.postalCode}
            onChange={(event) => setForm({ ...form, postalCode: event.target.value })}
          />
        </label>
      </div>
      <label>
        Country code <span>(two letters)</span>
        <input
          required
          minLength={2}
          maxLength={2}
          pattern="[A-Za-z]{2}"
          value={form.country}
          onChange={(event) => setForm({ ...form, country: event.target.value.toUpperCase() })}
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button className="button orange" disabled={busy} type="submit">
          {busy ? 'Saving…' : 'Save address'}
        </button>
        <button className="button quiet" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
