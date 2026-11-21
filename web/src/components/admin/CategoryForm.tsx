'use client';
// Add a category (FR-CAT-02) with its default approval mode (FR-APR-01).
import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { friendlyError } from '@/lib/errors';
import type { ApprovalMode } from '@/lib/types';
import { Alert, Button, Field, inputCls } from '@/components/ui';

export default function CategoryForm({ onSaved, onClose }: { onSaved: (msg: string) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<ApprovalMode>('auto');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    setBusy(true);
    const { error: err } = await supabase.from('categories').insert({ name: name.trim(), default_approval: mode });
    setBusy(false);
    if (err) { setError(err.code === '23505' ? 'A category with this name already exists.' : friendlyError(err)); return; }
    onSaved(`Category ${name.trim()} added.`);
  }

  return (
    <form onSubmit={save} className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">New category</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="text-gray-500 hover:text-gray-900">&times;</button>
      </div>
      <Field label="Name" htmlFor="c-name"><input id="c-name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
      <Field label="Default approval" htmlFor="c-mode" hint="Resources in this category use this unless they override it.">
        <select id="c-mode" value={mode} onChange={(e) => setMode(e.target.value as ApprovalMode)} className={inputCls}>
          <option value="auto">Auto-confirm</option>
          <option value="approval">Admin approval required</option>
        </select>
      </Field>
      {error && <Alert>{error}</Alert>}
      <Button type="submit" disabled={busy}>Add category</Button>
    </form>
  );
}
