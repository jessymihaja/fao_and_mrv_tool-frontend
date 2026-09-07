// src/components/admin/MultiSelectAvecAjout.tsx
import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, Check, X, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/api/client';
import { getErrorMessage } from '@/utils/apiError';

interface Option {
  id: number | string;
  label: string;
}

interface MultiSelectAvecAjoutProps {
  values: (number | string)[];
  onChange: (values: (number | string)[]) => void;
  options: Option[];
  queryKey: string;
  createEndpoint: string;
  idField: string;
  label: string;
  extraField?: { name: string; placeholder: string; label: string };
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function MultiSelectAvecAjout({
  values,
  onChange,
  options,
  queryKey,
  createEndpoint,
  idField,
  label,
  extraField,
  required = false,
  disabled = false,
  className = '',
}: MultiSelectAvecAjoutProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [designation, setDesignation] = useState('');
  const [extra, setExtra] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Fermer le menu si on clique en dehors
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowForm(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (showForm) inputRef.current?.focus();
  }, [showForm]);

  const toggle = (id: number | string) => {
    onChange(values.includes(id) ? values.filter(v => v !== id) : [...values, id]);
  };

  const removeTag = (id: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(values.filter(v => v !== id));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = { designation };
      if (extraField) body[extraField.name] = extra;
      const res = await api.post(createEndpoint, body);
      return res.data;
    },
    onSuccess: (data) => {
      qc.setQueryData([queryKey], (old: unknown) => {
        const arr = Array.isArray(old) ? old : [];
        return [...arr, data];
      });
      qc.invalidateQueries({ queryKey: [queryKey] });

      const newId = data[idField];
      if (newId !== undefined) onChange([...values, newId]);

      toast.success(`"${designation}" ajouté avec succès`);
      setDesignation('');
      setExtra('');
      setShowForm(false);
    },
    onError: (err) => {
      const msg = getErrorMessage(err, 'Erreur lors de la création');
      toast.error(msg);
    },
  });

  const handleAjouter = () => {
    if (!designation.trim()) {
      toast.error('La désignation est obligatoire');
      return;
    }
    mutation.mutate();
  };

  const stopEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleAjouter();
    }
  };

  const selectedOptions = values
    .map(v => options.find(o => o.id === v))
    .filter((o): o is Option => !!o);

  return (
    <div className={className} ref={rootRef}>
      <label className="form-label">
        {label}{required && ' *'}
      </label>

      <div className="relative">
        {/* ── Champ déclencheur (façon menu déroulant) ── */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(o => !o)}
          className="form-input w-full flex items-center justify-between gap-2 min-h-[42px] text-left disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {selectedOptions.length === 0 ? (
            <span className="text-gray-400">Sélectionner…</span>
          ) : (
            <span className="flex flex-wrap gap-1.5 py-0.5">
              {selectedOptions.map(opt => (
                <span
                  key={opt.id}
                  className="inline-flex items-center gap-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full"
                >
                  {opt.label}
                  <X
                    className="w-3 h-3 hover:text-green-900 cursor-pointer"
                    onClick={e => removeTag(opt.id, e)}
                  />
                </span>
              ))}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* ── Panneau déroulant ── */}
        {open && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            <div className="max-h-56 overflow-y-auto py-1">
              {options.length === 0 && (
                <p className="text-sm text-gray-400 italic px-3 py-2">Aucune option disponible</p>
              )}
              {options.map(opt => (
                <label
                  key={opt.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-green-600 rounded"
                    checked={values.includes(opt.id)}
                    onChange={() => toggle(opt.id)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            {/* ── Ajouter une nouvelle option ── */}
            {!showForm ? (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-green-600 hover:bg-green-50 border-t border-gray-100"
              >
                <Plus className="w-4 h-4" /> Ajouter « {label} »
              </button>
            ) : (
              <div className="flex flex-col gap-2.5 p-3 bg-green-50 border-t border-green-200">
                <p className="text-xs font-semibold text-green-700">
                  ➕ Nouvelle option pour « {label} »
                </p>

                {extraField ? (
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder={extraField.placeholder}
                      value={extra}
                      onChange={e => setExtra(e.target.value)}
                      onKeyDown={stopEnter}
                      className="form-input col-span-1 text-sm"
                    />
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Désignation *"
                      value={designation}
                      onChange={e => setDesignation(e.target.value)}
                      onKeyDown={stopEnter}
                      className="form-input col-span-2 text-sm"
                    />
                  </div>
                ) : (
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Nouvelle désignation *"
                    value={designation}
                    onChange={e => setDesignation(e.target.value)}
                    onKeyDown={stopEnter}
                    className="form-input text-sm"
                  />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={mutation.isPending || !designation.trim()}
                    onClick={handleAjouter}
                    className="btn btn-primary btn-sm flex-1"
                  >
                    {mutation.isPending
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Ajout…</>
                      : <><Check className="w-3.5 h-3.5" /> Ajouter</>
                    }
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setDesignation(''); setExtra(''); }}
                    disabled={mutation.isPending}
                    className="btn btn-secondary btn-sm"
                  >
                    <X className="w-3.5 h-3.5" /> Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}